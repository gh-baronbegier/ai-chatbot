"use client";

import { useEffect, useState } from "react";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { generateChatId } from "@/lib/utils";

export default function Page() {
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
        initialMessages={[]}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
      />
      <DataStreamHandler />
    </>
  );
}
