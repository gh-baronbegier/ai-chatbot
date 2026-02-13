"use client";

import type { ChatMessage } from "@/lib/types";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";

export function ChatPageClient({
  id,
  initialMessages,
  isReadonly,
}: {
  id: string;
  initialMessages: ChatMessage[];
  isReadonly: boolean;
}) {
  return (
    <>
      <Chat
        autoResume={true}
        id={id}
        initialMessages={initialMessages}
        isReadonly={isReadonly}
      />
      <DataStreamHandler />
    </>
  );
}
