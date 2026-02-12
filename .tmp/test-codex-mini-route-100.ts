import { config } from "dotenv";
import { POST } from "../app/(chat)/api/codex-mini-test/route";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const req = new Request("http://localhost/api/codex-mini-test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      prompt: "What is 100 + 100? Return only the number.",
    }),
  });

  const res = await POST(req);
  const body = await res.text();

  console.log("status=", res.status);
  console.log("body=", body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
