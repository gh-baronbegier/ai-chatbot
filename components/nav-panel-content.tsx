"use client";

import { usePathname, useRouter } from "next/navigation";
// import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import { toast as sonnerToast } from "sonner";
import useSWR from "swr";
import { DataGridPremium, type GridColDef } from "@mui/x-data-grid-premium";
import {
  dataGridBaseSx,
  dataGridTransparentSx,
  dataGridDeepTransparentSx,
  dataGridTransparentVarsSx,
  dataGridWhiteTextSx,
} from "@/lib/datagrid-sx";
import { fetcher } from "@/lib/utils";
import {
  PlusIcon,
  TrashIcon,
} from "./icons";
import {
  type ChatHistory,
} from "./sidebar-history";
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

// --- DataGrid columns (base, extended in component) ---

// --- Main component ---

// type NavView = "chat" | "model";

export default function NavPanelContent({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // const { setTheme, resolvedTheme } = useTheme();

  // const [view, setView] = useState<NavView>("chat");
  // const [modelSearch, setModelSearch] = useState("");

  const activeChatId = pathname && pathname !== "/" ? pathname.split("/")[1] : null;

  // --- Chat history (fetch all at once) ---
  const {
    data: chatHistory,
    isLoading,
    mutate,
  } = useSWR<ChatHistory>("/api/history?limit=1000", fetcher);

  const chats = chatHistory?.chats ?? [];
  const hasEmptyChatHistory = chats.length === 0;

  const rows = useMemo(
    () => chats.map((chat) => ({ id: chat.id, title: chat.title })),
    [chats]
  );

  // --- Delete single chat ---
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "title",
        flex: 1,
        renderCell: (params) => (
          <span
            className="group/row"
            style={{
              display: "flex",
              alignItems: "center",
              width: "100%",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontSize: "0.875rem",
              }}
            >
              {params.value}
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
                color: "inherit",
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
        ),
      },
    ],
    []
  );

  const handleDelete = () => {
    const chatToDelete = deleteId;
    const isCurrentChat = pathname === `/${chatToDelete}`;

    setShowDeleteDialog(false);

    const deletePromise = fetch(`/api/chat?id=${chatToDelete}`, {
      method: "DELETE",
    });

    sonnerToast.promise(deletePromise, {
      loading: "Deleting chat...",
      success: () => {
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
        mutate({ chats: [], hasMore: false }, { revalidate: false });
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
        {/* Chat action bar — always visible, not scrollable */}
        <div className="shrink-0 px-2">
          <div className="flex items-center justify-between">
            <button
              className="flex size-8 items-center justify-center rounded-md text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
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
              className="flex size-8 items-center justify-center rounded-md text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10"
              onClick={() => setShowDeleteAllDialog(true)}
              title="Delete All Chats"
              type="button"
            >
              <TrashIcon size={14} className="invisible" />
            </button>
          </div>
        </div>

        {/* Scrollable chat history */}
        <div className="flex-1 overflow-hidden p-2">
              {isLoading ? null : hasEmptyChatHistory ? (
                <div className="px-2 py-4 text-center text-sm text-black dark:text-white">
                  No chats yet
                </div>
              ) : (
                <div style={{ height: "100%", width: "100%" }}>
                  <DataGridPremium
                    rows={rows}
                    columns={columns}
                    density="compact"
                    rowHeight={32}
                    columnHeaderHeight={0}
                    hideFooter
                    disableColumnMenu
                    disableRowSelectionOnClick
                    disableRowGrouping
                    onRowClick={(params) => {
                      router.push(`/${params.row.id}`);
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
                      border: "none",
                      "--DataGrid-cellOffsetMultiplier": 0,
                      "& .MuiDataGrid-columnHeaders": {
                        display: "none",
                      },
                      "& .MuiDataGrid-row--borderBottom": {
                        display: "none",
                      },
                      "& .MuiDataGrid-row": {
                        minHeight: "32px !important",
                        maxHeight: "32px !important",
                        cursor: "pointer",
                        borderRadius: "6px",
                        "&:hover": { background: "transparent !important" },
                        "&.active-chat-row": { background: "rgba(0,0,0,0.1) !important" },
                        ".dark &.active-chat-row": { background: "rgba(255,255,255,0.1) !important" },
                      },
                      "& .MuiDataGrid-cell": {
                        minHeight: "32px !important",
                        maxHeight: "32px !important",
                        lineHeight: "32px",
                        padding: "0 8px",
                        border: "none",
                      },
                      "& .MuiDataGrid-row *": { fontWeight: "400 !important" },
                      "& .MuiDataGrid-withBorderColor": { borderColor: "transparent" },
                      "& .MuiDataGrid-topContainer": { display: "none" },
                    } as any}
                  />
                </div>
              )}
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
