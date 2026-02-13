import type { UseChatHelpers } from "@ai-sdk/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { ChatMessage } from "@/lib/types";
import { useDataStream } from "./data-stream-provider";

const PreviewMessage = dynamic(
  () => import("./message").then((m) => ({ default: m.PreviewMessage })),
  { ssr: false },
);

const ThinkingMessage = dynamic(
  () => import("./message").then((m) => ({ default: m.ThinkingMessage })),
  { ssr: false },
);

const INTERACTIVE_SELECTOR =
  'a, button, input, textarea, select, [role="button"], [contenteditable="true"], pre, img, video, [data-interactive]';

type MessagesProps = {
  addToolApprovalResponse: UseChatHelpers<ChatMessage>["addToolApprovalResponse"];
  chatId: string;
  status: UseChatHelpers<ChatMessage>["status"];
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  regenerate: UseChatHelpers<ChatMessage>["regenerate"];
  isReadonly: boolean;
  onBackgroundTap?: () => void;
  inputSlot?: React.ReactNode;
};

function PureMessages({
  addToolApprovalResponse,
  chatId,
  status,
  messages,
  setMessages,
  regenerate,
  isReadonly,
  onBackgroundTap,
  inputSlot,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
  } = useMessages({
    status,
  });

  useDataStream();

  const touchRef = useRef({ startX: 0, startY: 0, moved: false });

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    touchRef.current = { startX: t.clientX, startY: t.clientY, moved: false };
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    const { startX, startY } = touchRef.current;
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    if (dx * dx + dy * dy > 100) {
      touchRef.current.moved = true;
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.chatAtBottom = String(isAtBottom);
  }, [isAtBottom]);

  useEffect(() => {
    const handler = () => scrollToBottom("smooth");
    window.addEventListener("scroll-chat-to-bottom", handler);
    return () => window.removeEventListener("scroll-chat-to-bottom", handler);
  }, [scrollToBottom]);

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!onBackgroundTap) return;
      if (touchRef.current.moved) return;
      if (
        (event.target as HTMLElement).closest?.(INTERACTIVE_SELECTOR)
      )
        return;
      if ((window.getSelection()?.toString().length ?? 0) > 0) return;
      onBackgroundTap();
    },
    [onBackgroundTap]
  );

  return (
    <div className="relative flex-1">
      <div
        className="absolute inset-0 touch-pan-y overflow-y-auto overflow-x-hidden"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        ref={messagesContainerRef}
      >
        <div className="mx-auto flex min-h-full min-w-0 max-w-4xl flex-col gap-4 px-2 pt-[52px] pb-4 md:gap-6 md:px-4">
          {messages.map((message, index) => (
            <PreviewMessage
              addToolApprovalResponse={addToolApprovalResponse}
              chatId={chatId}
              isLoading={
                status === "streaming" && messages.length - 1 === index
              }
              isReadonly={isReadonly}
              key={message.id}
              message={message}
              regenerate={regenerate}
              setMessages={setMessages}
            />
          ))}

          {status === "ready" && inputSlot}
          <div className="flex-1" />
          <div
            className="min-h-[24px] min-w-[24px] shrink-0"
            ref={messagesEndRef}
          />
        </div>
      </div>

    </div>
  );
}

export const Messages = PureMessages;
