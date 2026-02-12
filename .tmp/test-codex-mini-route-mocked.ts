import { POST } from "../app/(chat)/api/codex-mini-test/route";

function toBase64Url(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
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
  authHeaderPresent: false,
  accountHeader: "",
  betaHeader: "",
  originatorHeader: "",
};

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  if (url.startsWith("https://example.com")) {
    return new Response(JSON.stringify([{ result: null }]), {
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
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  }

  if (url === "https://chatgpt.com/backend-api/codex/responses") {
    const headers = new Headers(init?.headers);
    seen.codexUrl = url;
    seen.authHeaderPresent = (headers.get("authorization") || "").startsWith("Bearer ");
    seen.accountHeader = headers.get("chatgpt-account-id") || "";
    seen.betaHeader = headers.get("openai-beta") || "";
    seen.originatorHeader = headers.get("originator") || "";

    return new Response(
      JSON.stringify({
        id: "resp_test_1",
        model: "gpt-5.1-codex-mini",
        output: [
          {
            type: "message",
            role: "assistant",
            id: "msg_1",
            content: [
              {
                type: "output_text",
                text: "hi",
                annotations: [],
              },
            ],
          },
        ],
        usage: {
          input_tokens: 1,
          output_tokens: 1,
        },
      }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  }

  return new Response(`Unexpected URL: ${url}`, { status: 500 });
}) as typeof fetch;

async function main() {
  const req = new Request("http://localhost/api/codex-mini-test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "hi" }),
  });

  const res = await POST(req);
  const body = await res.text();

  console.log("status=", res.status);
  console.log("body=", body);
  console.log("codex_url=", seen.codexUrl);
  console.log("auth_header_present=", seen.authHeaderPresent);
  console.log("account_header=", seen.accountHeader);
  console.log("beta_header=", seen.betaHeader);
  console.log("originator_header=", seen.originatorHeader);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
