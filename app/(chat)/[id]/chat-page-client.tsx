"use client";

import dynamic from "next/dynamic";
import type { ChatMessage } from "@/lib/types";
import { ChatSkeleton } from "../chat-skeleton";

const DynamicChat = dynamic(
  () => import("@/components/chat").then((m) => ({ default: m.Chat })),
  { ssr: true, loading: () => <ChatSkeleton /> },
);

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
      <DynamicChat
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
