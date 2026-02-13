"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { ChatMessage } from "@/lib/types";
import { generateChatId } from "@/lib/utils";
import { ChatSkeleton } from "./chat-skeleton";

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

type ForkPayload = {
  initialMessages: ChatMessage[];
  initialInput: string;
  autoSendInitialInput: boolean;
};

export function NewChatClient() {
  const [id] = useState(() => generateChatId());
  const sp = useSearchParams();

  const fork = sp.get("fork");
  const until = sp.get("until");
  const msg = sp.get("msg");

  const needsForkBoot = Boolean(fork);
  const bootedRef = useRef(false);
  const [forkLoading, setForkLoading] = useState(needsForkBoot);
  const [forkData, setForkData] = useState<ForkPayload | null>(null);

  useEffect(() => {
    if (!needsForkBoot || bootedRef.current) return;
    bootedRef.current = true;

    const controller = new AbortController();
    setForkLoading(true);

    const url = new URL("/api/fork", window.location.origin);
    url.searchParams.set("fork", fork!);
    if (until) url.searchParams.set("until", until);
    if (msg) url.searchParams.set("msg", msg);

    fetch(url.toString(), { signal: controller.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ForkPayload | null) => {
        if (data) setForkData(data);
      })
      .catch(() => {
        // Fork failed — fall back to blank chat.
      })
      .finally(() => setForkLoading(false));

    return () => controller.abort();
  }, [needsForkBoot, fork, until, msg]);

  const effective = useMemo(() => {
    return {
      initialMessages: forkData?.initialMessages ?? [],
      initialInput: forkData?.initialInput ?? "",
      autoSendInitialInput: forkData?.autoSendInitialInput ?? false,
    };
  }, [forkData]);

  if (forkLoading) {
    return <ChatSkeleton />;
  }

  const isFork =
    effective.initialMessages.length > 0 || effective.initialInput.length > 0;

  return (
    <>
      <Chat
        autoResume={false}
        id={id}
        initialMessages={effective.initialMessages}
        initialVisibilityType="private"
        isReadonly={false}
        key={id}
        initialInput={effective.initialInput}
        isFork={isFork}
        autoSendInitialInput={effective.autoSendInitialInput}
      />
      <DataStreamHandler />
    </>
  );
}
