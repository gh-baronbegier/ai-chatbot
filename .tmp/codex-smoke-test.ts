import { generateText } from "ai";
import { getLanguageModel } from "../lib/ai/providers";

function toBase64Url(input: string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = toBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = toBase64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

process.env.UPSTASH_REDIS_URL = "https://example.com";
process.env.UPSTASH_REDIS_TOKEN = "dummy";
process.env.OPENAI_CODEX_REFRESH_TOKEN = "refresh-token-from-env";

const seen = {
  codexUrl: "",
  authHeader: "",
  accountHeader: "",
  betaHeader: "",
  originatorHeader: "",
};

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  // Simulate Upstash GET/SET API calls as cache misses/successes.
  if (url.startsWith("https://example.com")) {
    return new Response(JSON.stringify({ result: null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  if (url === "https://auth.openai.com/oauth/token") {
    const jwt = makeFakeJwt({
      "https://api.openai.com/auth": {
        chatgpt_account_id: "acct_test_123",
      },
    });

    return new Response(
      JSON.stringify({
        access_token: jwt,
        refresh_token: "rotated-refresh-token",
        expires_in: 3600,
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  if (url === "https://chatgpt.com/backend-api/codex/responses") {
    const headers = new Headers(init?.headers);
    seen.codexUrl = url;
    seen.authHeader = headers.get("authorization") || "";
    seen.accountHeader = headers.get("chatgpt-account-id") || "";
    seen.betaHeader = headers.get("openai-beta") || "";
    seen.originatorHeader = headers.get("originator") || "";

    return new Response(
      JSON.stringify({
        id: "resp_test_1",
        object: "response",
        model: "gpt-5.1-codex-max",
        created_at: Math.floor(Date.now() / 1000),
        output: [
          {
            id: "msg_1",
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "hi" }],
          },
        ],
        usage: {
          input_tokens: 1,
          output_tokens: 1,
          total_tokens: 2,
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  return new Response(`Unexpected URL: ${url}`, { status: 500 });
}) as typeof fetch;

async function main() {
  const model = getLanguageModel("openai-codex-direct/gpt-5.1-codex-max");
  const result = await generateText({ model, prompt: "hi" });

  console.log("result_text=", result.text);
  console.log("codex_url=", seen.codexUrl);
  console.log("auth_header_present=", seen.authHeader.startsWith("Bearer "));
  console.log("account_header=", seen.accountHeader);
  console.log("beta_header=", seen.betaHeader);
  console.log("originator_header=", seen.originatorHeader);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
