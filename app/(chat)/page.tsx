import { Suspense } from "react";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages, splitAtForkMessage } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import { NewChatClient } from "./new-chat-client";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ fork?: string; until?: string }>;
}) {
  return (
    <Suspense fallback={<div className="flex h-dvh" />}>
      <NewChatPage searchParams={searchParams} />
    </Suspense>
  );
}

async function NewChatPage({
  searchParams,
}: {
  searchParams: Promise<{ fork?: string; until?: string }>;
}) {
  const { fork, until } = await searchParams;
  let initialMessages: ChatMessage[] = [];
  let initialInput = "";

  if (fork) {
    try {
      const chat = await getChatById({ id: fork });
      if (chat) {
        const dbMessages = await getMessagesByChatId({ id: fork });
        const uiMessages = convertToUIMessages(dbMessages);
        const { history, forkMessageText } = splitAtForkMessage(uiMessages, until);
        initialMessages = history;
        initialInput = forkMessageText;
      }
    } catch {
      /* blank fallback */
    }
  }

  return (
    <NewChatClient
      initialMessages={initialMessages}
      initialInput={initialInput}
    />
  );
}
