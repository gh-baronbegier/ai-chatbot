import { Suspense } from "react";
import { getChatById, getMessagesByChatId } from "@/lib/db/queries";
import { convertToUIMessages, splitAtForkMessage } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";
import { NewChatClient } from "./new-chat-client";

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ fork?: string; until?: string; msg?: string }>;
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
  searchParams: Promise<{ fork?: string; until?: string; msg?: string }>;
}) {
  const { fork, until, msg } = await searchParams;
  let initialMessages: ChatMessage[] = [];
  let initialInput = "";
  let autoSendInitialInput = false;

  if (fork) {
    try {
      const chat = await getChatById({ id: fork });
      if (chat) {
        const dbMessages = await getMessagesByChatId({ id: fork });
        const uiMessages = convertToUIMessages(dbMessages);

        if (msg) {
          // Readonly fork-on-submit: ALL messages as history, auto-send msg
          initialMessages = uiMessages;
          initialInput = msg;
          autoSendInitialInput = true;
        } else if (until) {
          // Existing click-to-fork: split at clicked message
          const { history, forkMessageText } = splitAtForkMessage(uiMessages, until);
          initialMessages = history;
          initialInput = forkMessageText;
        } else {
          initialMessages = uiMessages;
        }
      }
    } catch {
      /* blank fallback */
    }
  }

  return (
    <NewChatClient
      initialMessages={initialMessages}
      initialInput={initialInput}
      autoSendInitialInput={autoSendInitialInput}
    />
  );
}
