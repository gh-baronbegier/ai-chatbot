import { config } from "dotenv";
import { streamText, type ModelMessage } from "ai";
import { getLanguageModel } from "../lib/ai/providers";

config({ path: ".env.local" });
config({ path: ".env" });

async function runTurn(messages: ModelMessage[] | undefined, prompt?: string) {
  const result = streamText({
    model: getLanguageModel("openai-codex-direct/gpt-5.1-codex-mini"),
    system: "You are Codex, OpenAI's coding assistant.",
    ...(messages ? { messages } : { prompt: prompt ?? "hi" }),
    providerOptions: {
      openai: {
        store: false,
      },
    },
  });

  const [text, response] = await Promise.all([result.text, result.response]);
  return { text, messages: response.messages };
}

async function main() {
  const turn1 = await runTurn(undefined, "Say hi in one short sentence.");
  console.log("turn1_text=", turn1.text);

  const turn2Messages: ModelMessage[] = [
    ...turn1.messages,
    { role: "user", content: [{ type: "text", text: "what is 100 + 100?" }] },
  ];

  const turn2 = await runTurn(turn2Messages);
  console.log("turn2_text=", turn2.text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
