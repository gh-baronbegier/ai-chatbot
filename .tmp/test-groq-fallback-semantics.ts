import { config } from "dotenv";
import { streamText } from "ai";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const { getFallbackModel } = await import("../lib/ai/providers");

  const result = streamText({
    model: getFallbackModel(),
    prompt: "What is 10 + 10? Return only the number.",
    providerOptions: {
      openai: {
        store: false,
        reasoningEffort: "xhigh",
      },
    },
    maxOutputTokens: 256,
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
