import type { UseChatHelpers } from "@ai-sdk/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useRef } from "react";
import { useMessages } from "@/hooks/use-messages";
import type { ChatMessage } from "@/lib/types";
import { useDataStream } from "./data-stream-provider";
import { PreviewMessage } from "./message";

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

  // The total row count: messages + input slot + bottom spacer
  // Always include input row to keep virtualizer row count stable across status changes
  const rowCount = messages.length + 2;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => messagesContainerRef.current,
    estimateSize: (index) => {
      if (index >= messages.length) return 40; // input slot / spacer
      return 160;
    },
    paddingStart: 36, // clear the fixed top nav bar
    overscan: 8,
    getItemKey: (index) => {
      if (index < messages.length) return messages[index].id;
      if (index === messages.length) return "__input__";
      return "__spacer__";
    },
  });

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
    [onBackgroundTap],
  );

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="relative flex-1">
      <div
        className="absolute inset-0 touch-pan-y overflow-y-auto overflow-x-hidden"
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        ref={messagesContainerRef}
      >
        <div className="mx-auto min-w-0 max-w-[768px] px-[0.375rem]">
        <div
          style={{
            height: virtualizer.getTotalSize(),
            position: "relative",
          }}
        >
          {virtualItems.map((virtualRow) => {
            const index = virtualRow.index;

            // Input slot — always present to keep row count stable
            if (index === messages.length) {
              return (
                <div
                  key="__input__"
                  data-index={index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {inputSlot}
                </div>
              );
            }

            // Bottom spacer (scroll anchor)
            if (index === messages.length + 1) {
              return (
                <div
                  key="__spacer__"
                  data-index={index}
                  ref={(el) => {
                    virtualizer.measureElement(el);
                    // Also wire up the end ref for auto-scroll-to-bottom
                    (messagesEndRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="min-h-[24px] min-w-[24px] shrink-0"
                />
              );
            }

            // Message row
            const message = messages[index];

            // Placeholder for upcoming AI response — invisible but takes up measured space
            if (message.id === "__placeholder__") {
              return (
                <div
                  key="__placeholder__"
                  data-index={index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    transform: `translateY(${virtualRow.start}px)`,
                    visibility: "hidden",
                  }}
                  className="pb-4 md:pb-6"
                >
                  <PreviewMessage
                    addToolApprovalResponse={addToolApprovalResponse}
                    chatId={chatId}
                    isLoading={true}
                    isReadonly={isReadonly}
                    message={message}
                    regenerate={regenerate}
                    setMessages={setMessages}
                  />
                </div>
              );
            }

            return (
              <div
                key={message.id}
                data-index={index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="pb-4 md:pb-6"
              >
                <PreviewMessage
                  addToolApprovalResponse={addToolApprovalResponse}
                  chatId={chatId}
                  isLoading={
                    status === "streaming" && messages.length - 1 === index
                  }
                  isReadonly={isReadonly}
                  message={message}
                  regenerate={regenerate}
                  setMessages={setMessages}
                />
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}

export const Messages = PureMessages;
