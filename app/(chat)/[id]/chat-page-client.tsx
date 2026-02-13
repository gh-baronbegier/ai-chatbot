"use client";

import dynamic from "next/dynamic";
import type { ChatMessage } from "@/lib/types";
import { Chat } from "@/components/chat";

const DataStreamHandler = dynamic(
  () =>
    import("@/components/data-stream-handler").then(
      (mod) => mod.DataStreamHandler,
    ),
  { ssr: false },
);

export function ChatPageClient({
  id,
  initialMessages,
  isReadonly,
  initialHasMore,
  initialHistoryCursor,
}: {
  id: string;
  initialMessages: ChatMessage[];
  isReadonly: boolean;
  initialHasMore: boolean;
  initialHistoryCursor: string | null;
}) {
  return (
    <>
      <Chat
        autoResume={true}
        id={id}
        initialMessages={initialMessages}
        isReadonly={isReadonly}
        initialHasMore={initialHasMore}
        initialHistoryCursor={initialHistoryCursor}
      />
      <DataStreamHandler />
    </>
  );
}
