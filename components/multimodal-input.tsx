"use client";

import type { UseChatHelpers } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import equal from "fast-deep-equal";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type Dispatch,
  memo,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";
import type { Attachment, ChatMessage } from "@/lib/types";
import { guestRegex } from "@/lib/constants";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { cn } from "@/lib/utils";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "./elements/prompt-input";
import { ArrowUpIcon, PaperclipIcon, PlusIcon, StopIcon } from "./icons";
import { PreviewAttachment } from "./preview-attachment";
import { toast as toastAction } from "./toast";
import { Button } from "./ui/button";
import type { VisibilityType } from "./visibility-selector";

function PureMultimodalInput({
  chatId,
  input,
  setInput,
  status,
  stop,
  attachments,
  setAttachments,
  messages,
  setMessages,
  sendMessage,
  className,
  selectedVisibilityType,
  isNavPanelOpen,
  onNavToggle,
  textareaRef: externalTextareaRef,
}: {
  chatId: string;
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  status: UseChatHelpers<ChatMessage>["status"];
  stop: () => void;
  attachments: Attachment[];
  setAttachments: Dispatch<SetStateAction<Attachment[]>>;
  messages: UIMessage[];
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
  sendMessage: UseChatHelpers<ChatMessage>["sendMessage"];
  className?: string;
  selectedVisibilityType: VisibilityType;
  isNavPanelOpen?: boolean;
  onNavToggle?: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef ?? internalTextareaRef;

  const [localStorageInput, setLocalStorageInput] = useLocalStorage(
    "input",
    ""
  );
  const hasHydrated = useRef(false);

  // Read from localStorage ONCE on mount
  useEffect(() => {
    if (!hasHydrated.current && localStorageInput) {
      setInput(localStorageInput);
      hasHydrated.current = true;
    }
  }, [localStorageInput, setInput]);

  // Write input to localStorage on change (one-way, no circular trigger)
  useEffect(() => {
    if (hasHydrated.current) {
      setLocalStorageInput(input);
    }
  }, [input, setLocalStorageInput]);

  // Single focus mechanism on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(event.target.value);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const submitForm = useCallback(() => {
    window.history.pushState({}, "", `/chat/${chatId}`);

    sendMessage({
      role: "user",
      parts: [
        ...attachments.map((attachment) => ({
          type: "file" as const,
          url: attachment.url,
          name: attachment.name,
          mediaType: attachment.contentType,
        })),
        {
          type: "text",
          text: input,
        },
      ],
    });

    setAttachments([]);
    setLocalStorageInput("");
    setInput("");
  }, [input, setInput, attachments, sendMessage, setAttachments, setLocalStorageInput, chatId]);

  const uploadFile = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const { url, pathname, contentType } = data;

        return {
          url,
          name: pathname,
          contentType,
        };
      }
      const { error } = await response.json();
      toast.error(error);
    } catch (_error) {
      toast.error("Failed to upload file, please try again!");
    }
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) => attachment !== undefined
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);
      } catch (error) {
        console.error("Error uploading files!", error);
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items) {
        return;
      }

      const imageItems = Array.from(items).filter((item) =>
        item.type.startsWith("image/")
      );

      if (imageItems.length === 0) {
        return;
      }

      // Prevent default paste behavior for images
      event.preventDefault();

      setUploadQueue((prev) => [...prev, "Pasted image"]);

      try {
        const uploadPromises = imageItems
          .map((item) => item.getAsFile())
          .filter((file): file is File => file !== null)
          .map((file) => uploadFile(file));

        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment) =>
            attachment !== undefined &&
            attachment.url !== undefined &&
            attachment.contentType !== undefined
        );

        setAttachments((curr) => [
          ...curr,
          ...(successfullyUploadedAttachments as Attachment[]),
        ]);
      } catch (error) {
        console.error("Error uploading pasted images:", error);
        toast.error("Failed to upload pasted image(s)");
      } finally {
        setUploadQueue([]);
      }
    },
    [setAttachments, uploadFile]
  );

  // Add paste event listener to textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.addEventListener("paste", handlePaste);
    return () => textarea.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const isGuest = guestRegex.test(session?.user?.email ?? "");

  if (isNavPanelOpen) {
    return (
      <div className={cn("relative flex w-full flex-col gap-4", className)}>
        <div className="rounded-none border border-white bg-black/40 backdrop-blur-[3px] px-0 py-0 flex flex-col justify-center">
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1">
            <button
              className="flex size-7 items-center justify-center text-white"
              data-nav-toggle
              onClick={onNavToggle}
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <polyline fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points="3.5 15, 15 3.5" />
                <polyline fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points="3.5 3.5, 15 15" />
              </svg>
            </button>
            <div className="flex items-center justify-center">
              <button
                className="text-sm text-white px-2"
                onClick={() => {
                  if (sessionStatus === "loading") {
                    toastAction({
                      type: "error",
                      description:
                        "Checking authentication status, please try again!",
                    });
                    return;
                  }
                  if (isGuest) {
                    router.push("/login");
                  } else {
                    signOut({ redirectTo: "/" });
                  }
                }}
                type="button"
              >
                {isGuest ? "Login" : "Sign out"}
              </button>
            </div>
            <button
              className="flex size-7 items-center justify-center text-white"
              onClick={() => {
                router.push("/");
                router.refresh();
                onNavToggle?.();
              }}
              title="New Chat"
              type="button"
            >
              <PlusIcon size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative flex w-full flex-col gap-4", className)}>
      <input
        className="pointer-events-none fixed -top-4 -left-4 size-0.5 opacity-0"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />

      <PromptInput
        className="rounded-none border border-white bg-black/40 backdrop-blur-[3px] px-0 py-0 shadow-none flex flex-col justify-center"
        onSubmit={(event) => {
          event.preventDefault();
          if (!input.trim() && attachments.length === 0) {
            return;
          }
          if (status !== "ready") {
            toast.error("Please wait for the model to finish its response!");
          } else {
            submitForm();
          }
        }}
      >
        {(attachments.length > 0 || uploadQueue.length > 0) && (
          <div
            className="flex flex-row items-end gap-2 overflow-x-scroll pb-1"
            data-testid="attachments-preview"
          >
            {attachments.map((attachment) => (
              <PreviewAttachment
                attachment={attachment}
                key={attachment.url}
                onRemove={() => {
                  setAttachments((currentAttachments) =>
                    currentAttachments.filter((a) => a.url !== attachment.url)
                  );
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              />
            ))}

            {uploadQueue.map((filename) => (
              <PreviewAttachment
                attachment={{
                  url: "",
                  name: filename,
                  contentType: "",
                }}
                isUploading={true}
                key={filename}
              />
            ))}
          </div>
        )}
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-1">
          <button
            className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
            data-nav-toggle
            onClick={onNavToggle}
            type="button"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ visibility: "hidden" }}>
              <polyline fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points="2 12, 16 12" />
              <polyline fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points="2 5, 16 5" />
            </svg>
          </button>
          <PromptInputTextarea
            autoFocus
            className="caret-transparent min-h-0! h-auto! grow resize-none border-0! border-none! bg-transparent px-2 py-0 text-base leading-[28px] text-center outline-none ring-0 [-ms-overflow-style:none] [scrollbar-width:none] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 [&::-webkit-scrollbar]:hidden"
            data-testid="multimodal-input"
            disableAutoResize={true}
            maxHeight={200}
            minHeight={0}
            onChange={handleInput}
            placeholder=""
            ref={textareaRef}
            rows={1}
            value={input}
          />
          {status === "submitted" ? (
            <StopButton setMessages={setMessages} stop={stop} />
          ) : input.trim() ? (
            <PromptInputSubmit
              className="size-7 rounded-full bg-transparent text-muted-foreground hover:text-foreground"
              data-testid="send-button"
              status={status}
            >
              <ArrowUpIcon size={14} className="invisible" />
            </PromptInputSubmit>
          ) : (
            <button
              className="flex size-7 items-center justify-center text-muted-foreground hover:text-foreground"
              data-testid="attachments-button"
              onClick={(event) => {
                event.preventDefault();
                fileInputRef.current?.click();
              }}
              type="button"
            >
              <PlusIcon size={14} className="invisible" />
            </button>
          )}
        </div>
      </PromptInput>
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    if (prevProps.input !== nextProps.input) {
      return false;
    }
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (!equal(prevProps.attachments, nextProps.attachments)) {
      return false;
    }
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType) {
      return false;
    }
    if (prevProps.isNavPanelOpen !== nextProps.isNavPanelOpen) {
      return false;
    }

    return true;
  }
);

function PureAttachmentsButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  status: UseChatHelpers<ChatMessage>["status"];
}) {
  const isReasoningModel =
    DEFAULT_CHAT_MODEL.includes("reasoning") || DEFAULT_CHAT_MODEL.includes("think");

  return (
    <Button
      className="aspect-square h-8 rounded-full p-1 hover:bg-accent"
      data-testid="attachments-button"
      disabled={status !== "ready" || isReasoningModel}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      variant="ghost"
    >
      <PaperclipIcon size={14} style={{ width: 14, height: 14 }} />
    </Button>
  );
}

const AttachmentsButton = memo(PureAttachmentsButton);

function PureStopButton({
  stop,
  setMessages,
}: {
  stop: () => void;
  setMessages: UseChatHelpers<ChatMessage>["setMessages"];
}) {
  return (
    <button
      className="flex items-center justify-center size-7"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        stop();
        setMessages((messages) => messages);
      }}
    >
      <div className="size-3.5 bg-white invisible" />
    </button>
  );
}

const StopButton = memo(PureStopButton);
