"use client";

import dynamic from "next/dynamic";
import type { ChatMessage } from "@/lib/types";
import type { VisibilityType } from "@/components/visibility-selector";
import { ChatSkeleton } from "../chat-skeleton";

const Chat = dynamic(
  () => import("@/components/chat").then((m) => ({ default: m.Chat })),
  { ssr: false, loading: () => <ChatSkeleton /> },
);

const DataStreamHandler = dynamic(
  () =>
    import("@/components/data-stream-handler").then((m) => ({
      default: m.DataStreamHandler,
    })),
  { ssr: false },
);

export function ChatPageClient({
  id,
  initialMessages,
  initialVisibilityType,
  isReadonly,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  return (
    <>
      <Chat
        autoResume={true}
        id={id}
        initialMessages={initialMessages}
        initialVisibilityType={initialVisibilityType}
        isReadonly={isReadonly}
      />
      <DataStreamHandler />
    </>
  );
}
