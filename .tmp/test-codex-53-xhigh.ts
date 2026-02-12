import { config } from "dotenv";
import { streamText } from "ai";
import { getLanguageModel } from "../lib/ai/providers";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const result = streamText({
    model: getLanguageModel("openai-codex-direct/gpt-5.3-codex"),
    prompt: "What is 100 + 100? Return only the number.",
    providerOptions: {
      openai: {
        store: false,
        reasoningEffort: "xhigh",
      },
    },
  });

  const [text, finishReason, usage] = await Promise.all([
    result.text,
    result.finishReason,
    result.usage,
  ]);

  console.log("text=", text);
  console.log("finishReason=", finishReason);
  console.log("usage=", JSON.stringify(usage));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
