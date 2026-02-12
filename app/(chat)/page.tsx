import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages, sliceMessagesUntil } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import { NewChatClient } from "./new-chat-client";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ fork?: string; until?: string }>;
}) {
  const { fork, until } = await searchParams;
  let initialMessages: ChatMessage[] = [];

  if (fork) {
    try {
      const chat = await getChatById({ id: fork });
      if (chat) {
        const dbMessages = await getMessagesByChatId({ id: fork });
        const uiMessages = convertToUIMessages(dbMessages);
        initialMessages = sliceMessagesUntil(uiMessages, until);
      }
    } catch {
      /* blank fallback */
    }
  }

  return <NewChatClient initialMessages={initialMessages} />;
}
