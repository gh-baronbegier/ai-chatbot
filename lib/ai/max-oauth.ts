import { Redis } from "@upstash/redis";

const TOKEN_ENDPOINT = "https://console.anthropic.com/v1/oauth/token";
const CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const BUFFER_MS = 5 * 60 * 1000; // 5 minutes before expiry

const REDIS_ACCESS_TOKEN_KEY = "claude-max:access_token";
const REDIS_ACCESS_TOKEN_EXPIRY_KEY = "claude-max:access_token_expiry";
const REDIS_REFRESH_TOKEN_KEY = "claude-max:refresh_token";

// Concurrency guard: deduplicates simultaneous refresh calls within a single invocation
let inflightRefresh: Promise<string> | null = null;

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_URL!,
    token: process.env.UPSTASH_REDIS_TOKEN!,
  });
}

async function readCachedToken(
  redis: Redis
): Promise<{ accessToken: string; expiresAt: number } | null> {
  try {
    const [accessToken, expiresAt] = await Promise.all([
      redis.get<string>(REDIS_ACCESS_TOKEN_KEY),
      redis.get<number>(REDIS_ACCESS_TOKEN_EXPIRY_KEY),
    ]);

    if (accessToken && expiresAt && Date.now() < expiresAt - BUFFER_MS) {
      return { accessToken, expiresAt };
    }
  } catch (err) {
    console.warn("[max-oauth] Redis read failed, will refresh token:", err);
  }
  return null;
}

async function getRefreshToken(redis: Redis): Promise<string> {
  // Try Redis first (may have a rotated token from a previous refresh)
  try {
    const storedToken = await redis.get<string>(REDIS_REFRESH_TOKEN_KEY);
    if (storedToken) return storedToken;
  } catch (err) {
    console.warn("[max-oauth] Redis read for refresh token failed:", err);
  }

  // Fall back to env var
  const envToken = process.env.CLAUDE_MAX_REFRESH_TOKEN;
  if (envToken) return envToken;

  throw new Error(
    "[max-oauth] No refresh token available. " +
      "Run `npx anthropic-max-router` locally to complete the OAuth flow, " +
      "then copy refresh_token from .oauth-tokens.json into the CLAUDE_MAX_REFRESH_TOKEN env var."
  );
}

async function refreshAccessToken(): Promise<string> {
  const redis = getRedis();
  const refreshToken = await getRefreshToken(redis);

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `[max-oauth] Token refresh failed (${response.status}): ${body}. ` +
        "If your refresh token has expired, run `npx anthropic-max-router` again to re-authenticate."
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  const expiresAt = Date.now() + data.expires_in * 1000;

  console.log("[max-oauth] Token refreshed, expires in", data.expires_in, "s");

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
    ]);
  } catch (err) {
    console.warn(
      "[max-oauth] Failed to cache access token in Redis:",
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
        "[max-oauth] Failed to persist rotated refresh token to Redis:",
        err
      );
    }
  }

  return data.access_token;
}

export async function getMaxAccessToken(): Promise<string> {
  // Check Redis cache first
  const redis = getRedis();
  const cached = await readCachedToken(redis);
  if (cached) return cached.accessToken;

  // Deduplicate concurrent refresh calls within the same invocation
  if (inflightRefresh) return inflightRefresh;

  inflightRefresh = refreshAccessToken().finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}
