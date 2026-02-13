"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAlwaysActiveTextarea } from "@/hooks/use-always-active-textarea";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useModel } from "./model-provider";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { useDataStream } from "./data-stream-provider";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "./elements/prompt-input";
import { ArrowUpIcon, VoiceWaveIcon } from "./icons";
import { Messages } from "./messages";
import { NavPanel } from "./nav-panel";
import { getChatHistoryPaginationKey } from "@/lib/chat-history-keys";
import { toast } from "./toast";
export function Chat({
  id,
  initialMessages,
  isReadonly,
  autoResume,
  initialInput = "",
  isFork = false,
  autoSendInitialInput = false,
}: {
  id: string;
  initialMessages: ChatMessage[];
  isReadonly: boolean;
  autoResume: boolean;
  initialInput?: string;
  isFork?: boolean;
  autoSendInitialInput?: boolean;
}) {
  const router = useRouter();

  const { mutate } = useSWRConfig();

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // When user navigates back/forward, refresh to sync with URL
      router.refresh();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [router]);
  const { setDataStream } = useDataStream();

  useEffect(() => {
    if (isFork) {
      window.history.replaceState({}, "", `/${id}`);
    }
  }, [isFork]);

  const [input, setInput] = useState<string>(initialInput);
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const { thinkingBudget, maxTokens, selectedModel } = useModel();
  const latestRef = useRef({ thinkingBudget, maxTokens, selectedModel });
  latestRef.current = { thinkingBudget, maxTokens, selectedModel };

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    resumeStream,
    addToolApprovalResponse,
  } = useChat<ChatMessage>({
    id,
    messages: initialMessages,
    generateId: generateUUID,
    sendAutomaticallyWhen: ({ messages: currentMessages }) => {
      const lastMessage = currentMessages.at(-1);
      const shouldContinue =
        lastMessage?.parts?.some(
          (part) =>
            "state" in part &&
            part.state === "approval-responded" &&
            "approval" in part &&
            (part.approval as { approved?: boolean })?.approved === true
        ) ?? false;
      return shouldContinue;
    },
    transport: new DefaultChatTransport({
      api: "/api/chat",
      fetch: fetchWithErrorHandlers,
      prepareSendMessagesRequest(request) {
        const lastMessage = request.messages.at(-1);
        const isToolApprovalContinuation =
          lastMessage?.role !== "user" ||
          request.messages.some((msg) =>
            msg.parts?.some((part) => {
              const state = (part as { state?: string }).state;
              return (
                state === "approval-responded" || state === "output-denied"
              );
            })
          );

        return {
          body: {
            id: request.id,
            ...(isToolApprovalContinuation
              ? { messages: request.messages }
              : { message: lastMessage }),
            selectedChatModel: latestRef.current.selectedModel,
            thinkingBudget: latestRef.current.thinkingBudget,
            maxTokens: latestRef.current.maxTokens,
            ...request.body,
          },
        };
      },
    }),
    onData: (dataPart) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        if (
          error.message?.includes("AI Gateway requires a valid credit card")
        ) {
          setShowCreditCardAlert(true);
        } else {
          toast({
            type: "error",
            description: error.message,
          });
        }
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      sendMessage({
        role: "user" as const,
        parts: [{ type: "text", text: query }],
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, "", `/${id}`);
    }
  }, [query, sendMessage, hasAppendedQuery, id]);

  const [isNavPanelOpen, setIsNavPanelOpen] = useState(false);
  const toggleNavPanel = useCallback(() => setIsNavPanelOpen((prev) => !prev), []);
  const closeNavPanel = useCallback(() => setIsNavPanelOpen(false), []);
  // Sync data-nav-panel-open attribute so the top bar script can update its icons
  useEffect(() => {
    document.documentElement.dataset.navPanelOpen = isNavPanelOpen ? "true" : "false";
  }, [isNavPanelOpen]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useAlwaysActiveTextarea(textareaRef, { disabled: false });
  const focusTextarea = useCallback(() => textareaRef.current?.focus(), []);

  const submitForm = useCallback(() => {
    if (!input.trim()) return;
    window.history.pushState({}, "", `/${id}`);
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: input }],
    });
    setInput("");
  }, [input, setInput, sendMessage, id]);

  // Listen for toggle-nav-panel custom event from the top bar script
  useEffect(() => {
    const handler = () => toggleNavPanel();
    window.addEventListener("toggle-nav-panel", handler);
    return () => window.removeEventListener("toggle-nav-panel", handler);
  }, [toggleNavPanel]);

  useAutoResume({
    autoResume,
    initialMessages,
    resumeStream,
    setMessages,
  });

  const hasAutoSentRef = useRef(false);
  const sendMessageRef = useRef(sendMessage);
  sendMessageRef.current = sendMessage;

  useEffect(() => {
    if (autoSendInitialInput && initialInput && !hasAutoSentRef.current) {
      hasAutoSentRef.current = true;
      sendMessageRef.current({
        role: "user",
        parts: [{ type: "text", text: initialInput }],
      });
      setInput("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh w-full min-w-0 touch-pan-y flex-col bg-background">
        <div className={`flex flex-1 flex-col min-h-0 pt-[36px] pb-[36px] px-[0.375rem] ${isNavPanelOpen ? "" : "hidden"}`}>
          <NavPanel isOpen={isNavPanelOpen} onClose={closeNavPanel} />
        </div>
        <div className={isNavPanelOpen ? "hidden" : "contents"}>
          <Messages
            addToolApprovalResponse={addToolApprovalResponse}
            chatId={id}
            isReadonly={isReadonly}
            messages={messages}
            onBackgroundTap={focusTextarea}
            regenerate={regenerate}
            setMessages={setMessages}
            status={status}
            inputSlot={
                <PromptInput
                  className="rounded-none border-none bg-transparent px-0 py-0 shadow-none flex flex-col justify-center"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (isReadonly) {
                      if (!input.trim()) return;
                      window.open(`/?fork=${id}&msg=${encodeURIComponent(input.trim())}`, "_blank");
                      setInput("");
                      return;
                    }
                    if (status !== "ready") return;
                    submitForm();
                  }}
                >
                  <div className="flex items-center">
                    <button type="button" className="flex shrink-0 items-center justify-center text-foreground opacity-0 pointer-events-none">
                      <VoiceWaveIcon size={20} />
                    </button>
                    <PromptInputTextarea
                      autoFocus
                      className="min-h-0! h-auto! grow resize-none border-0! border-none! bg-transparent pl-2 pr-4 py-3 text-base leading-[1.625rem] tracking-[-0.025rem] text-right outline-none ring-0 text-foreground [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
                      data-testid="multimodal-input"
                      disableAutoResize={true}
                      maxHeight={200}
                      minHeight={0}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="ask anything"
                      ref={textareaRef}
                      rows={1}
                      value={input}
                    />
                  </div>
                </PromptInput>
            }
          />
        </div>
      </div>

      <AlertDialog
        onOpenChange={setShowCreditCardAlert}
        open={showCreditCardAlert}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
            <AlertDialogDescription>
              This application requires{" "}
              {process.env.NODE_ENV === "production" ? "the owner" : "you"} to
              activate Vercel AI Gateway.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                window.open(
                  "https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card",
                  "_blank"
                );
                window.location.href = "/";
              }}
            >
              Activate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
