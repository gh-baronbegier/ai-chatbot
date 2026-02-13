"use server";

import { generateText, type UIMessage } from "ai";
import { cookies } from "next/headers";
import { titlePrompt } from "@/lib/ai/prompts";
import { getTitleModel } from "@/lib/ai/providers";
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
} from "@/lib/db/queries";
import { getTextFromMessage } from "@/lib/utils";
import { MODELS, PROVIDER_ENV_KEYS } from "@/lib/ai/models";

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set("chat-model", model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  try {
    const { text } = await generateText({
      model: getTitleModel(),
      system: titlePrompt,
      prompt: getTextFromMessage(message),
    });
    return text
      .replace(/^[#*"\s]+/, "")
      .replace(/["]+$/, "")
      .trim() || "New chat";
  } catch {
    return "New chat";
  }
}

export async function getAvailableModelIds(): Promise<string[]> {
  return MODELS.filter((m) => {
    const envKey = PROVIDER_ENV_KEYS[m.provider];
    return envKey ? !!process.env[envKey] : true;
  }).map((m) => m.id);
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}
