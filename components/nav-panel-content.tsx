"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { DEFAULT_CHAT_MODEL, MODELS, OPENAI_CODEX_CHAT_MODEL, OPENAI_CODEX_52_CHAT_MODEL } from "@/lib/ai/models";
import { fetcher } from "@/lib/utils";
import { useModel } from "./model-provider";
import {
  type ChatHistory,
} from "@/lib/chat-history-keys";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

// --- Tools view ---

interface ToolInfo {
  id: string;
  name: string;
  description: string;
}

interface McpToolInfo {
  id: string;
  name: string;
  description: string;
  server: string;
}

interface ToolsApiResponse {
  tools: ToolInfo[];
  mcpTools: McpToolInfo[];
}

function ToolsView() {
  const { data, isLoading } = useSWR<ToolsApiResponse>("/api/tools", fetcher);
  const tools = data?.tools ?? [];
  const mcpTools = data?.mcpTools ?? [];
  if (isLoading) return null;

  const mcpGrouped = mcpTools.reduce<Record<string, McpToolInfo[]>>((acc, tool) => {
    (acc[tool.server] ??= []).push(tool);
    return acc;
  }, {});

  if (tools.length === 0 && mcpTools.length === 0) {
    return (
      <div className="px-2 py-4 text-center text-sm text-black dark:text-white">
        no tools configured
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {tools.map((tool) => (
        <Collapsible key={tool.id}>
          <CollapsibleTrigger className="flex w-full justify-center py-1 text-base tracking-[-0.025rem]">
            <span className="truncate px-3">{tool.name}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="text-center text-xs opacity-50 px-6 pb-1">{tool.description}</div>
          </CollapsibleContent>
        </Collapsible>
      ))}
      {Object.entries(mcpGrouped).map(([server, serverTools]) => (
        <Collapsible key={server}>
          <CollapsibleTrigger className="flex w-full justify-center py-1 text-base tracking-[-0.025rem] font-bold">
            <span className="truncate px-3">{server}</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            {serverTools.map((tool) => (
              <Collapsible key={tool.id}>
                <CollapsibleTrigger className="flex w-full justify-center py-0.5 text-sm tracking-[-0.025rem]">
                  <span className="truncate px-3">{tool.name}</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="text-center text-xs opacity-50 px-6 pb-1">{tool.description}</div>
                </CollapsibleContent>
              </Collapsible>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

// --- Relative time helper ---

function relativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// --- Main component ---

type NavView = "chats" | "tools";

export default function NavPanelContent({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedModel, setSelectedModel, availableModelIds } = useModel();

  const [view, setView] = useState<NavView>("chats");

  const activeChatId = pathname && pathname !== "/" ? pathname.split("/")[1] : null;

  // --- Chat history (fetch all at once) ---
  const {
    data: chatHistory,
    isLoading,
    mutate,
  } = useSWR<ChatHistory>("/api/history?limit=1000", fetcher);

  const chats = chatHistory?.chats ?? [];
  const hasEmptyChatHistory = chats.length === 0;

  // --- Delete single chat ---
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    const chatToDelete = deleteId;
    const isCurrentChat = pathname === `/${chatToDelete}`;

    setShowDeleteDialog(false);

    fetch(`/api/chat?id=${chatToDelete}`, { method: "DELETE" }).then(() => {
      mutate(
        (current) =>
          current
            ? {
                ...current,
                chats: current.chats.filter(
                  (chat) => chat.id !== chatToDelete
                ),
              }
            : current,
        { revalidate: false }
      );

      if (isCurrentChat) {
        router.replace("/");
        router.refresh();
      }
    });
  };

  // --- Delete all chats ---
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const handleDeleteAll = () => {
    fetch("/api/history", { method: "DELETE" }).then(() => {
      mutate({ chats: [], hasMore: false }, { revalidate: false });
      setShowDeleteAllDialog(false);
      router.replace("/");
      router.refresh();
    });
  };

  const selectedModelLabel = MODELS.find((m) => m.id === selectedModel)?.label ?? "Claude Opus 4.6";

  // Sync view and model label to <html> so the global bottom bar script can read them
  useEffect(() => {
    document.documentElement.dataset.navView = view;
    document.documentElement.dataset.navModelLabel = selectedModelLabel;
  }, [view, selectedModelLabel]);

  return (
    <>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Model selector */}
        <div className="flex justify-center shrink-0 py-2">
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger className="text-2xl font-medium outline-none">
              {selectedModelLabel} ▾
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="rounded-none border-none bg-background shadow-none">
              {MODELS.map((model) => {
                const isFeatured =
                  model.id === DEFAULT_CHAT_MODEL ||
                  model.id === OPENAI_CODEX_CHAT_MODEL ||
                  model.id === OPENAI_CODEX_52_CHAT_MODEL;
                const isAvailable = availableModelIds.includes(model.id);
                return (
                  <DropdownMenuItem
                    key={model.id}
                    disabled={!isAvailable}
                    onClick={() => isAvailable && setSelectedModel(model.id)}
                    className={`text-2xl justify-center hover:bg-transparent! focus:bg-transparent!${isFeatured ? " font-bold text-blue-500" : ""}${!isAvailable ? " opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {model.label}{!isAvailable ? " (coming soon)" : ""}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tabs */}
        <Tabs
          value={view}
          onValueChange={(val) => setView(val as NavView)}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <TabsList className="shrink-0 w-full justify-center bg-transparent h-auto py-2">
            <TabsTrigger value="chats" className="text-2xl px-4 py-1 bg-transparent! shadow-none! data-[state=active]:bg-transparent! data-[state=active]:shadow-none!">chats</TabsTrigger>
            <TabsTrigger value="tools" className="text-2xl px-4 py-1 bg-transparent! shadow-none! data-[state=active]:bg-transparent! data-[state=active]:shadow-none!">tools</TabsTrigger>
          </TabsList>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            {view === "chats" ? (
              <div className="flex flex-col h-full">
                <button
                  type="button"
                  className="flex w-full justify-center py-1"
                  onClick={() => {
                    router.push("/");
                    onNavigate();
                  }}
                >
                  <span className="text-base tracking-[-0.025rem] font-bold">New Chat</span>
                </button>
                {isLoading ? null : hasEmptyChatHistory ? (
                  <div className="px-2 py-4 text-center text-sm text-black dark:text-white">
                    No chats yet
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    {chats.map((chat) => (
                      <div
                        key={chat.id}
                        className="relative flex w-full items-center justify-center py-1 px-3"
                      >
                        <span className="absolute left-3 text-xs opacity-40 whitespace-nowrap">
                          {relativeTime(new Date(chat.createdAt))}
                        </span>
                        <button
                          type="button"
                          className="text-center text-base tracking-[-0.025rem] truncate max-w-[60%]"
                          onClick={() => {
                            router.push(`/${chat.id}`);
                            onNavigate();
                          }}
                        >
                          {chat.title}
                        </button>
                        <button
                          type="button"
                          className="absolute right-3 opacity-30 hover:opacity-100 transition-opacity"
                          onClick={() => {
                            setDeleteId(chat.id);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <svg width="14" height="16" viewBox="0 0 19.2676 23.4863" fill="currentColor">
                            <path d="M6.5625 18.6035C6.93359 18.6035 7.17773 18.3691 7.16797 18.0273L6.86523 7.57812C6.85547 7.23633 6.61133 7.01172 6.25977 7.01172C5.88867 7.01172 5.64453 7.24609 5.6543 7.58789L5.94727 18.0273C5.95703 18.3789 6.20117 18.6035 6.5625 18.6035ZM9.45312 18.6035C9.82422 18.6035 10.0879 18.3691 10.0879 18.0273L10.0879 7.58789C10.0879 7.24609 9.82422 7.01172 9.45312 7.01172C9.08203 7.01172 8.82812 7.24609 8.82812 7.58789L8.82812 18.0273C8.82812 18.3691 9.08203 18.6035 9.45312 18.6035ZM12.3535 18.6035C12.7051 18.6035 12.9492 18.3789 12.959 18.0273L13.252 7.58789C13.2617 7.24609 13.0176 7.01172 12.6465 7.01172C12.2949 7.01172 12.0508 7.23633 12.041 7.58789L11.748 18.0273C11.7383 18.3691 11.9824 18.6035 12.3535 18.6035ZM5.16602 4.46289L6.71875 4.46289L6.71875 2.37305C6.71875 1.81641 7.10938 1.45508 7.69531 1.45508L11.1914 1.45508C11.7773 1.45508 12.168 1.81641 12.168 2.37305L12.168 4.46289L13.7207 4.46289L13.7207 2.27539C13.7207 0.859375 12.8027 0 11.2988 0L7.58789 0C6.08398 0 5.16602 0.859375 5.16602 2.27539ZM0.732422 5.24414L18.1836 5.24414C18.584 5.24414 18.9062 4.90234 18.9062 4.50195C18.9062 4.10156 18.584 3.76953 18.1836 3.76953L0.732422 3.76953C0.341797 3.76953 0 4.10156 0 4.50195C0 4.91211 0.341797 5.24414 0.732422 5.24414ZM4.98047 21.748L13.9355 21.748C15.332 21.748 16.2695 20.8398 16.3379 19.4434L17.0215 5.05859L15.4492 5.05859L14.7949 19.2773C14.7754 19.8633 14.3555 20.2734 13.7793 20.2734L5.11719 20.2734C4.56055 20.2734 4.14062 19.8535 4.11133 19.2773L3.41797 5.05859L1.88477 5.05859L2.57812 19.4531C2.64648 20.8496 3.56445 21.748 4.98047 21.748Z"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <ToolsView />
            )}
          </div>
        </Tabs>
      </div>

      {/* Delete single chat dialog */}
      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete all chats dialog */}
      <AlertDialog
        onOpenChange={setShowDeleteAllDialog}
        open={showDeleteAllDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              your chats and remove them from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll}>
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
