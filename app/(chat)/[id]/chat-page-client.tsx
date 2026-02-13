"use client";

import { useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { ChatSkeleton } from "../chat-skeleton";

type FetchState = {
  messages: ChatMessage[];
  isReadonly: boolean;
  hasMore: boolean;
  nextCursor: string | null;
};

export function ChatPageClient({ id }: { id: string }) {
  const [state, setState] = useState<FetchState | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/chat/${id}/messages?limit=30`)
      .then((res) => {
        if (res.status === 404) {
          setNotFound(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled || !data) return;
        setState({
          messages: data.messages,
          isReadonly: data.isReadonly,
          hasMore: data.hasMore,
          nextCursor: data.nextCursor,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (notFound) {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
    return <ChatSkeleton />;
  }

  if (!state) {
    return <ChatSkeleton />;
  }

  return (
    <>
      <Chat
        autoResume={true}
        id={id}
        initialMessages={state.messages}
        isReadonly={state.isReadonly}
        initialHasMore={state.hasMore}
        initialHistoryCursor={state.nextCursor}
      />
      <DataStreamHandler />
    </>
  );
}
