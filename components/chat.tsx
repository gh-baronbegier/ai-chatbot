"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
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
import { useArtifactSelector } from "@/hooks/use-artifact";
import { useAutoResume } from "@/hooks/use-auto-resume";
import { useChatVisibility } from "@/hooks/use-chat-visibility";
import { useModel } from "./model-provider";
import type { Vote } from "@/lib/db/schema";
import { ChatSDKError } from "@/lib/errors";
import type { ChatMessage } from "@/lib/types";
import { fetcher, fetchWithErrorHandlers, generateUUID } from "@/lib/utils";
import { Artifact } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
} from "./elements/prompt-input";
import { ArrowUpIcon, VoiceWaveIcon } from "./icons";
import { Messages } from "./messages";
import { NavPanel } from "./nav-panel";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import { toast } from "./toast";
import type { VisibilityType } from "./visibility-selector";

export function Chat({
  id,
  initialMessages,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialInput = "",
  isFork = false,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialInput?: string;
  isFork?: boolean;
}) {
  const router = useRouter();

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

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
      window.history.replaceState({}, "", "/");
    }
  }, [isFork]);

  const [input, setInput] = useState<string>(initialInput);
  // const [showPlaceholder, setShowPlaceholder] = useState(() => {
  //   if (typeof window === 'undefined') return true;
  //   return !localStorage.getItem('bb-sent');
  // });
  const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
  const { thinkingBudget, maxTokens, selectedModel } = useModel();
  const thinkingBudgetRef = useRef(thinkingBudget);
  const maxTokensRef = useRef(maxTokens);
  const selectedModelRef = useRef(selectedModel);

  useEffect(() => {
    thinkingBudgetRef.current = thinkingBudget;
  }, [thinkingBudget]);

  useEffect(() => {
    maxTokensRef.current = maxTokens;
  }, [maxTokens]);

  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

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
            selectedChatModel: selectedModelRef.current,
            selectedVisibilityType: visibilityType,
            thinkingBudget: thinkingBudgetRef.current,
            maxTokens: maxTokensRef.current,
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

  const { data: votes } = useSWR<Vote[]>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher
  );

  const [isNavPanelOpen, setIsNavPanelOpen] = useState(false);
  const toggleNavPanel = useCallback(() => setIsNavPanelOpen((prev) => !prev), []);
  const closeNavPanel = useCallback(() => setIsNavPanelOpen(false), []);
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  // Sync data-nav-panel-open attribute so the top bar script can update its icons
  useEffect(() => {
    document.documentElement.dataset.navPanelOpen = isNavPanelOpen ? "true" : "false";
  }, [isNavPanelOpen]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  useAlwaysActiveTextarea(textareaRef, { disabled: isReadonly });
  const focusTextarea = useCallback(() => textareaRef.current?.focus(), []);

  const submitForm = useCallback(() => {
    if (!input.trim()) return;
    window.history.pushState({}, "", `/${id}`);
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: input }],
    });
    setInput("");
    // if (showPlaceholder) {
    //   localStorage.setItem('bb-sent', '1');
    //   setShowPlaceholder(false);
    // }
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

  return (
    <>
      <div className="overscroll-behavior-contain flex h-dvh w-full min-w-0 touch-pan-y flex-col bg-background">
        <Messages
          addToolApprovalResponse={addToolApprovalResponse}
          chatId={id}
          isArtifactVisible={isArtifactVisible}
          isReadonly={isReadonly}
          messages={messages}
          onBackgroundTap={focusTextarea}
          regenerate={regenerate}
          setMessages={setMessages}
          status={status}
          votes={votes}
          inputSlot={
            !isReadonly && (
              <PromptInput
                className="rounded-none border-none bg-transparent px-0 py-0 shadow-none flex flex-col justify-center"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (status !== "ready") return;
                  submitForm();
                }}
              >
                <div className="flex items-center">
                  <button type="button" className="flex shrink-0 items-center justify-center text-black dark:text-white opacity-0 pointer-events-none">
                    <VoiceWaveIcon size={20} />
                  </button>
                  <PromptInputTextarea
                    autoFocus
                    className="min-h-0! h-auto! grow resize-none border-0! border-none! bg-transparent pl-2 pr-4 py-3 text-base leading-[1.625rem] tracking-[-0.025rem] text-right outline-none ring-0 text-black dark:text-white [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
                    data-testid="multimodal-input"
                    disableAutoResize={true}
                    maxHeight={200}
                    minHeight={0}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask Anything"
                    ref={textareaRef}
                    rows={1}
                    value={input}
                  />
                </div>
              </PromptInput>
            )
          }
        />

        <div
          className="fixed inset-x-0 top-[36px] bottom-[36px] z-10 mx-auto flex flex-col px-[0.375rem]"
          style={{
            visibility: isNavPanelOpen ? "visible" : "hidden",
            pointerEvents: isNavPanelOpen ? "auto" : "none",
          }}
        >
          <NavPanel isOpen={isNavPanelOpen} onClose={closeNavPanel} />
        </div>
      </div>

      <Artifact
        addToolApprovalResponse={addToolApprovalResponse}
        chatId={id}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        sendMessage={sendMessage}
        setMessages={setMessages}
        status={status}
        stop={stop}
        votes={votes}
      />

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
