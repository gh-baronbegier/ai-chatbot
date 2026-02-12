"use client";

import { useEffect, useState } from "react";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { generateChatId } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

export function NewChatClient({
  initialMessages = [],
  initialInput = "",
  autoSendInitialInput = false,
}: {
  initialMessages?: ChatMessage[];
  initialInput?: string;
  autoSendInitialInput?: boolean;
}) {
  const [id, setId] = useState<string | null>(null);

  useEffect(() => {
    setId(generateChatId());
  }, []);

  if (!id) return null;

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialMessages={initialMessages}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
        initialInput={initialInput}
        isFork={initialMessages.length > 0 || initialInput.length > 0}
        autoSendInitialInput={autoSendInitialInput}
      />
      <DataStreamHandler />
    </>
  );
}
