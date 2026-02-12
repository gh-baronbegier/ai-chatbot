import { Redis } from "@upstash/redis";

const TOKEN_ENDPOINT = "https://auth.openai.com/oauth/token";
const DEFAULT_CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const JWT_CLAIM_PATH = "https://api.openai.com/auth";
const BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

const REDIS_ACCESS_TOKEN_KEY = "openai-codex:access_token";
const REDIS_ACCESS_TOKEN_EXPIRY_KEY = "openai-codex:access_token_expiry";
const REDIS_REFRESH_TOKEN_KEY = "openai-codex:refresh_token";
const REDIS_ACCOUNT_ID_KEY = "openai-codex:account_id";

type OpenAICodexAuthContext = {
  accessToken: string;
  accountId: string;
};

// Concurrency guard: deduplicates simultaneous refresh calls within a single invocation
let inflightRefresh: Promise<OpenAICodexAuthContext> | null = null;

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  });
}

function getClientId(): string {
  return process.env.OPENAI_CODEX_CLIENT_ID || DEFAULT_CLIENT_ID;
}

function decodeJWT(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = Buffer.from(padded, "base64").toString("utf-8");
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractAccountId(accessToken: string): string | null {
  const decoded = decodeJWT(accessToken);
  if (!decoded) return null;

  const claim = decoded[JWT_CLAIM_PATH];
  if (!claim || typeof claim !== "object") return null;

  const accountId = (claim as Record<string, unknown>).chatgpt_account_id;
  return typeof accountId === "string" && accountId.length > 0
    ? accountId
    : null;
}

async function readCachedAuthContext(
  redis: Redis
): Promise<OpenAICodexAuthContext | null> {
  try {
    const [accessToken, expiresAt, cachedAccountId] = await Promise.all([
      redis.get<string>(REDIS_ACCESS_TOKEN_KEY),
      redis.get<number>(REDIS_ACCESS_TOKEN_EXPIRY_KEY),
      redis.get<string>(REDIS_ACCOUNT_ID_KEY),
    ]);

    if (accessToken && expiresAt && Date.now() < expiresAt - BUFFER_MS) {
      const accountId = cachedAccountId || extractAccountId(accessToken);
      if (accountId) {
        return { accessToken, accountId };
      }
    }
  } catch (err) {
    console.warn("[openai-codex-oauth] Redis read failed, will refresh token:", err);
  }
  return null;
}

async function getRefreshToken(redis: Redis): Promise<string> {
  // Try Redis first (may have a rotated token from a previous refresh)
  try {
    const storedToken = await redis.get<string>(REDIS_REFRESH_TOKEN_KEY);
    if (storedToken) return storedToken;
  } catch (err) {
    console.warn("[openai-codex-oauth] Redis read for refresh token failed:", err);
  }

  // Fall back to env var
  const envToken = process.env.OPENAI_CODEX_REFRESH_TOKEN;
  if (envToken) return envToken;

  throw new Error(
    "[openai-codex-oauth] No refresh token available. " +
      "Set OPENAI_CODEX_REFRESH_TOKEN with a valid ChatGPT OAuth refresh token."
  );
}

async function refreshAccessToken(): Promise<OpenAICodexAuthContext> {
  const redis = getRedis();
  const refreshToken = await getRefreshToken(redis);

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getClientId(),
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `[openai-codex-oauth] Token refresh failed (${response.status}): ${body}. ` +
        "Re-authenticate and update OPENAI_CODEX_REFRESH_TOKEN."
    );
  }

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };

  if (!data.access_token || typeof data.expires_in !== "number") {
    throw new Error(
      `[openai-codex-oauth] Token refresh response missing fields: ${JSON.stringify(data)}`
    );
  }

  const accountId = extractAccountId(data.access_token);
  if (!accountId) {
    throw new Error(
      "[openai-codex-oauth] Failed to extract chatgpt_account_id from access token."
    );
  }

  const expiresAt = Date.now() + data.expires_in * 1000;
  console.log(
    "[openai-codex-oauth] Token refreshed, expires in",
    data.expires_in,
    "s"
  );

  // Cache new access token in Redis
  try {
    const ttlSeconds = Math.max(1, data.expires_in - 60);
    await Promise.all([
      redis.set(REDIS_ACCESS_TOKEN_KEY, data.access_token, {
        ex: ttlSeconds,
      }),
      redis.set(REDIS_ACCESS_TOKEN_EXPIRY_KEY, expiresAt, {
        ex: ttlSeconds,
      }),
      redis.set(REDIS_ACCOUNT_ID_KEY, accountId, {
        ex: ttlSeconds,
      }),
    ]);
  } catch (err) {
    console.warn(
      "[openai-codex-oauth] Failed to cache token context in Redis:",
      err,
      "— token will still be used for this request"
    );
  }

  // Persist rotated refresh token if provided
  if (data.refresh_token) {
    try {
      await redis.set(REDIS_REFRESH_TOKEN_KEY, data.refresh_token);
    } catch (err) {
      console.warn(
        "[openai-codex-oauth] Failed to persist rotated refresh token to Redis:",
        err
      );
    }
  }

  return { accessToken: data.access_token, accountId };
}

export async function getOpenAICodexAuthContext(): Promise<OpenAICodexAuthContext> {
  const redis = getRedis();

  // Check Redis cache first
  const cached = await readCachedAuthContext(redis);
  if (cached) return cached;

  // Deduplicate concurrent refresh calls within the same invocation
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = refreshAccessToken().finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}
