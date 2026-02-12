import { streamText } from "ai";
import { getLanguageModel } from "@/lib/ai/providers";

const TEST_MODEL_ID = "openai-codex-direct/gpt-5.1-codex-mini";

async function runCodexMiniPrompt(prompt: string) {
  const result = streamText({
    model: getLanguageModel(TEST_MODEL_ID),
    system: "You are Codex, OpenAI's coding assistant.",
    prompt,
    maxOutputTokens: 256,
  });

  const [text, finishReason, usage] = await Promise.all([
    result.text,
    result.finishReason,
    result.usage,
  ]);

  return {
    ok: true as const,
    model: TEST_MODEL_ID,
    prompt,
    text,
    finishReason,
    usage: usage ?? null,
  };
}

function toErrorPayload(error: unknown, prompt: string) {
  return {
    ok: false as const,
    model: TEST_MODEL_ID,
    prompt,
    error: error instanceof Error ? error.message : String(error),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const prompt = searchParams.get("prompt")?.trim() || "hi";

  try {
    const payload = await runCodexMiniPrompt(prompt);
    return Response.json(payload, { status: 200 });
  } catch (error) {
    console.error("[codex-mini-test] GET failed:", error);
    return Response.json(toErrorPayload(error, prompt), { status: 500 });
  }
}

export async function POST(request: Request) {
  let prompt = "hi";

  try {
    const body = (await request.json()) as { prompt?: unknown };
    if (typeof body.prompt === "string" && body.prompt.trim().length > 0) {
      prompt = body.prompt.trim();
    }
  } catch {
    // Keep default prompt for empty or invalid JSON bodies.
  }

  try {
    const payload = await runCodexMiniPrompt(prompt);
    return Response.json(payload, { status: 200 });
  } catch (error) {
    console.error("[codex-mini-test] POST failed:", error);
    return Response.json(toErrorPayload(error, prompt), { status: 500 });
  }
}
