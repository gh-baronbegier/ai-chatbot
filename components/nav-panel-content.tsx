"use client";

import { CheckIcon, ChevronRight, ChevronDown } from "lucide-react";
import { isToday, isYesterday, subMonths, subWeeks } from "date-fns";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
// import { useTheme } from "next-themes";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast as sonnerToast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import useSWRInfinite from "swr/infinite";
import { DataGridPremium, type GridColDef } from "@mui/x-data-grid-premium";
import {
  dataGridBaseSx,
  dataGridTransparentSx,
  dataGridDeepTransparentSx,
  dataGridTransparentVarsSx,
  dataGridWhiteTextSx,
} from "@/lib/datagrid-sx";
import { guestRegex } from "@/lib/constants";
import type { Chat } from "@/lib/db/schema";
import {
  chatModels,
  DEFAULT_CHAT_MODEL,
  modelsByProvider,
} from "@/lib/ai/models";
import { cn, fetcher } from "@/lib/utils";
import {
  LoaderIcon,
  PlusIcon,
  TrashIcon,
} from "./icons";
import { useModel } from "./model-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  getChatHistoryPaginationKey,
  type ChatHistory,
} from "./sidebar-history";
import { toast } from "./toast";
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

// --- Recommended models ---

const recommendedModels = [
  { id: "claude-max-direct/claude-opus-4-6-think-medium", name: "Claude Opus 4.6", logo: "anthropic" },
  { id: "groq/openai/gpt-oss-120b", name: "GPT-OSS 120B (Groq)", logo: "groq" },
  { id: "openai/gpt-5.2-chat", name: "GPT-5.2 Chat", logo: "openai" },
];

const recommendedById = new Map(recommendedModels.map((m) => [m.id, m]));

// --- Provider display names ---

const providerNames: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  xai: "xAI",
  deepseek: "DeepSeek",
  meta: "Meta",
  mistral: "Mistral",
  venice: "Venice AI",
  groq: "Groq",
  "anthropic-direct": "Anthropic (Direct)",
  "openai-direct": "OpenAI (Direct)",
  "xai-direct": "xAI (Direct)",
  "google-direct": "Google (Direct)",
  "claude-max": "Claude MAX (Proxy)",
  "claude-max-direct": "Claude MAX (Direct)",
};

// --- Chat grouping ---

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  lastWeek: Chat[];
  lastMonth: Chat[];
  older: Chat[];
};

const groupChatsByDate = (chats: Chat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats
  );
};

// --- DataGrid columns ---

const columns: GridColDef[] = [
  { field: "title", flex: 1 },
  { field: "datePeriod" },
];

// --- Main component ---

// type NavView = "chat" | "model";

export default function NavPanelContent({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  // const { setTheme, resolvedTheme } = useTheme();
  const { mutate: globalMutate } = useSWRConfig();
  const {
    currentModelId,
    setCurrentModelId,
    thinkingBudget,
    setThinkingBudget,
    maxTokens,
    setMaxTokens,
  } = useModel();

  // const [view, setView] = useState<NavView>("chat");
  // const [modelSearch, setModelSearch] = useState("");

  const activeChatId = pathname?.startsWith("/chat/")
    ? pathname.split("/")[2]
    : null;

  const isGuest = guestRegex.test(session?.user?.email ?? "");

  const selectedModel =
    chatModels.find((m) => m.id === currentModelId) ??
    chatModels.find((m) => m.id === DEFAULT_CHAT_MODEL) ??
    chatModels[0];
  const recommendedMatch = recommendedById.get(selectedModel.id);
  const displayName = recommendedMatch?.name ?? selectedModel.name;


  // --- Filtered models for search (commented out — now using dropdown) ---
  // const filteredProviders = useMemo(() => {
  //   const q = modelSearch.toLowerCase();
  //   if (!q) return Object.entries(modelsByProvider);
  //   return Object.entries(modelsByProvider)
  //     .map(([key, models]) => [key, models.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))] as const)
  //     .filter(([, models]) => models.length > 0);
  // }, [modelSearch]);

  // --- Chat history ---
  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, fetcher, {
    fallbackData: [],
  });

  const hasReachedEnd = paginatedChatHistories
    ? paginatedChatHistories.some((page) => page.hasMore === false)
    : false;

  const hasEmptyChatHistory = paginatedChatHistories
    ? paginatedChatHistories.every((page) => page.chats.length === 0)
    : false;

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isValidating && !hasReachedEnd) {
          setSize((size) => size + 1);
        }
      },
      { threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isValidating, hasReachedEnd, setSize]);

  const chats = paginatedChatHistories
    ? paginatedChatHistories.flatMap((page) => page.chats)
    : [];

  const rows = useMemo(() => {
    const grouped = groupChatsByDate(chats);
    const entries: { key: keyof GroupedChats; label: string }[] = [
      { key: "today", label: "Today" },
      { key: "yesterday", label: "Yesterday" },
      { key: "lastWeek", label: "Last 7 days" },
      { key: "lastMonth", label: "Last 30 days" },
      { key: "older", label: "Older" },
    ];
    return entries.flatMap(({ key, label }) =>
      grouped[key].map((chat) => ({
        id: chat.id,
        title: chat.title,
        datePeriod: label,
      }))
    );
  }, [chats]);

  // --- Delete single chat ---
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    const chatToDelete = deleteId;
    const isCurrentChat = pathname === `/chat/${chatToDelete}`;

    setShowDeleteDialog(false);

    const deletePromise = fetch(`/api/chat?id=${chatToDelete}`, {
      method: "DELETE",
    });

    sonnerToast.promise(deletePromise, {
      loading: "Deleting chat...",
      success: () => {
        mutate((chatHistories) => {
          if (chatHistories) {
            return chatHistories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.filter(
                (chat) => chat.id !== chatToDelete
              ),
            }));
          }
        });

        if (isCurrentChat) {
          router.replace("/");
          router.refresh();
        }

        return "Chat deleted successfully";
      },
      error: "Failed to delete chat",
    });
  };

  // --- Delete all chats ---
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);

  const handleDeleteAll = () => {
    const deletePromise = fetch("/api/history", {
      method: "DELETE",
    });

    sonnerToast.promise(deletePromise, {
      loading: "Deleting all chats...",
      success: () => {
        globalMutate(unstable_serialize(getChatHistoryPaginationKey));
        setShowDeleteAllDialog(false);
        router.replace("/");
        router.refresh();
        return "All chats deleted successfully";
      },
      error: "Failed to delete all chats",
    });
  };

  return (
    <>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header — dropdown model selector */}
        <div className="flex shrink-0 justify-center p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex h-8 items-center gap-1 px-2 text-sm cursor-pointer text-white/70 hover:text-white"
                type="button"
              >
                <span className="truncate">{displayName}</span>
                <ChevronDown size={14} className="shrink-0 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="max-h-[70vh] overflow-y-auto w-64">
              <DropdownMenuLabel>Recommended</DropdownMenuLabel>
              {recommendedModels.map((rec) => (
                <DropdownMenuItem
                  key={rec.id}
                  onSelect={() => setCurrentModelId(rec.id)}
                >
                  <span className="flex-1 truncate">{rec.name}</span>
                  {selectedModel.id === rec.id && <CheckIcon className="ml-auto size-4 shrink-0" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              {Object.entries(modelsByProvider).map(([providerKey, providerModels]) => (
                <DropdownMenuSub key={providerKey}>
                  <DropdownMenuSubTrigger>
                    {providerNames[providerKey] ?? providerKey}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-[60vh] overflow-y-auto">
                    {providerModels.map((model) => (
                      <DropdownMenuItem
                        key={model.id}
                        onSelect={() => setCurrentModelId(model.id)}
                      >
                        <span className="flex-1 truncate">{model.name}</span>
                        {model.id === selectedModel.id && <CheckIcon className="ml-auto size-4 shrink-0" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Thinking / Max tokens sliders */}
        <div className="shrink-0 px-3 pb-2 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="w-[70px] shrink-0">Thinking</span>
            <input
              type="range"
              min={1000}
              max={128000}
              step={1000}
              value={thinkingBudget}
              onChange={(e) => setThinkingBudget(Number(e.target.value))}
              className="flex-1 h-1 appearance-none rounded bg-white/10 accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
            <span className="w-[40px] text-right text-white/70 tabular-nums">
              {thinkingBudget >= 1000 ? `${Math.round(thinkingBudget / 1000)}K` : thinkingBudget}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/50">
            <span className="w-[70px] shrink-0">Max tokens</span>
            <input
              type="range"
              min={1000}
              max={128000}
              step={1000}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Number(e.target.value))}
              className="flex-1 h-1 appearance-none rounded bg-white/10 accent-white [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
            />
            <span className="w-[40px] text-right text-white/70 tabular-nums">
              {maxTokens >= 1000 ? `${Math.round(maxTokens / 1000)}K` : maxTokens}
            </span>
          </div>
        </div>

        {/* Chat action bar — always visible, not scrollable */}
        <div className="shrink-0 px-2">
          <div className="flex items-center justify-between">
            <button
              className="flex size-8 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
              onClick={() => {
                router.push("/");
                router.refresh();
                onNavigate();
              }}
              title="New Chat"
              type="button"
            >
              <PlusIcon size={14} className="invisible" />
            </button>
            <button
              className="flex size-8 items-center justify-center rounded-md text-white/50 hover:bg-white/10 hover:text-white"
              onClick={() => setShowDeleteAllDialog(true)}
              title="Delete All Chats"
              type="button"
            >
              <TrashIcon size={14} className="invisible" />
            </button>
          </div>
        </div>

        {/* Scrollable chat history */}
        <div className="flex-1 overflow-y-auto p-2">
              {isLoading ? (
                <div className="flex items-center gap-2 p-2 text-sm text-white/50">
                  <div className="animate-spin">
                    <LoaderIcon size={14} className="invisible" />
                  </div>
                  Loading...
                </div>
              ) : hasEmptyChatHistory ? (
                <div className="px-2 py-4 text-center text-sm text-white/50">
                  No chats yet
                </div>
              ) : (
                <>
                  <DataGridPremium
                    rows={rows}
                    columns={columns}
                    autoHeight
                    density="compact"
                    columnHeaderHeight={0}
                    hideFooter
                    disableColumnMenu
                    disableRowSelectionOnClick
                    initialState={{
                      rowGrouping: { model: ["datePeriod"] },
                      columns: {
                        columnVisibilityModel: { title: false, datePeriod: false },
                      },
                    }}
                    defaultGroupingExpansionDepth={-1}
                    rowGroupingColumnMode="single"
                    groupingColDef={{
                      headerName: "",
                      flex: 1,
                      leafField: "title",
                      renderCell: (params) => {
                        if (params.rowNode.type === "group") {
                          const isExpanded = params.rowNode.childrenExpanded;
                          return (
                            <span
                              style={{ display: "flex", alignItems: "center", cursor: "pointer" }}
                              onClick={() =>
                                (params.api as any).setRowChildrenExpansion(params.id, !isExpanded)
                              }
                            >
                              {isExpanded ? (
                                <ChevronDown size={14} style={{ flexShrink: 0, color: "rgba(255,255,255,0.5)", visibility: "hidden" }} />
                              ) : (
                                <ChevronRight size={14} style={{ flexShrink: 0, color: "rgba(255,255,255,0.5)", visibility: "hidden" }} />
                              )}
                              <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                                {params.value}
                              </span>
                            </span>
                          );
                        }
                        // Leaf row — chat title + delete button on hover
                        return (
                          <span
                            className="group/row"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              width: "100%",
                              cursor: "pointer",
                            }}
                          >
                            <span style={{
                              flex: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: "0.875rem",
                            }}>
                              {params.row.title}
                            </span>
                            <button
                              className="opacity-0 group-hover/row:opacity-100"
                              style={{
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 24,
                                height: 24,
                                borderRadius: 6,
                                color: "rgba(255,255,255,0.5)",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(params.row.id);
                                setShowDeleteDialog(true);
                              }}
                              type="button"
                            >
                              <TrashIcon size={14} className="invisible" />
                            </button>
                          </span>
                        );
                      },
                    }}
                    onRowClick={(params) => {
                      if ((params as any).rowNode?.type === "group") return;
                      router.push(`/chat/${params.row.id}`);
                      onNavigate();
                    }}
                    getRowClassName={(params) =>
                      params.row.id === activeChatId ? "active-chat-row" : ""
                    }
                    sx={{
                      ...dataGridBaseSx,
                      ...dataGridTransparentSx,
                      ...dataGridDeepTransparentSx,
                      ...dataGridTransparentVarsSx,
                      ...dataGridWhiteTextSx,
                      "--DataGrid-cellOffsetMultiplier": 0,
                      "& .MuiDataGrid-row": {
                        minHeight: "32px !important",
                        maxHeight: "32px !important",
                        cursor: "pointer",
                        borderRadius: "6px",
                        "&:hover": { background: "rgba(255,255,255,0.1) !important" },
                        "&.active-chat-row": { background: "rgba(255,255,255,0.1) !important" },
                      },
                      "& .MuiDataGrid-cell": {
                        minHeight: "32px !important",
                        maxHeight: "32px !important",
                        lineHeight: "32px",
                        padding: "0 8px",
                      },
                      "& .MuiDataGrid-row *": { fontWeight: "400 !important" },
                    } as any}
                  />

                  <div ref={loadMoreRef} />

                  {!hasReachedEnd && (
                    <div className="flex items-center gap-2 p-2 text-sm text-white/50">
                      <div className="animate-spin">
                        <LoaderIcon size={14} className="invisible" />
                      </div>
                      Loading...
                    </div>
                  )}
                </>
              )}
        </div>

        {/* Footer */}
        <div className="shrink-0 p-2">
          <button
            className="flex w-full items-center rounded-md px-2 py-1.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
            onClick={() => {
              if (sessionStatus === "loading") {
                toast({
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
            {isGuest ? "Login to your account" : "Sign out"}
          </button>
        </div>
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
