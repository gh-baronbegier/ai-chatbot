"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast as sonnerToast } from "sonner";
import useSWR from "swr";
import { DataGridPremium, GridToolbar, type GridColDef } from "@mui/x-data-grid-premium";
import {
  dataGridBaseSx,
  dataGridTransparentSx,
  dataGridDeepTransparentSx,
  dataGridTransparentVarsSx,
  dataGridWhiteTextSx,
} from "@/lib/datagrid-sx";
import { MODELS } from "@/lib/ai/models";
import { fetcher } from "@/lib/utils";
import {
  PlusIcon,
  TrashIcon,
} from "./icons";
import { useModel } from "./model-provider";
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

const toolsGridSx = {
  ...dataGridBaseSx,
  ...dataGridTransparentSx,
  ...dataGridDeepTransparentSx,
  ...dataGridTransparentVarsSx,
  ...dataGridWhiteTextSx,
  backgroundColor: "transparent",
  color: "var(--foreground)",
  border: "none",
  "--DataGrid-cellOffsetMultiplier": 0,
  "& .MuiDataGrid-columnHeaders": {
    display: "none",
  },
  "& .MuiDataGrid-topContainer": {
    display: "none",
  },
  "& .MuiDataGrid-row": {
    minHeight: "44px !important",
    maxHeight: "44px !important",
    "&:hover": { background: "transparent !important" },
  },
  "& .MuiDataGrid-cell": {
    minHeight: "44px !important",
    maxHeight: "44px !important",
    lineHeight: "44px",
    padding: "0 8px",
    border: "none",
  },
  "& .MuiDataGrid-row *": { fontWeight: "400 !important" },
  "& .MuiDataGrid-withBorderColor": { borderColor: "transparent" },
} as any;

const toolbarSx = {
  "& .MuiDataGrid-toolbarContainer": {
    background: "transparent",
    padding: "4px 8px",
    "& .MuiButton-root": {
      color: "var(--foreground)",
      opacity: 0.6,
      fontSize: "0.75rem",
      "&:hover": { opacity: 1, background: "rgba(255,255,255,0.08)" },
    },
  },
} as const;

const menuColumns: GridColDef[] = [
  {
    field: "label",
    headerName: "Label",
    flex: 1,
    sortable: false,
    renderCell: (params) => (
      <span style={{ fontSize: "0.875rem" }}>{params.value}</span>
    ),
  },
  {
    field: "detail",
    headerName: "Detail",
    width: 160,
    sortable: false,
    renderCell: (params) => (
      <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>
        {params.value}
      </span>
    ),
  },
];

const toolColumns: GridColDef[] = [
  {
    field: "name",
    headerName: "Name",
    flex: 1,
    renderCell: (params) => (
      <span style={{ fontSize: "0.875rem" }}>{params.value}</span>
    ),
  },
  {
    field: "description",
    headerName: "Description",
    flex: 2,
    renderCell: (params) => (
      <span style={{ fontSize: "0.75rem", opacity: 0.45 }}>{params.value}</span>
    ),
  },
];

const mcpToolColumns: GridColDef[] = [
  {
    field: "name",
    headerName: "Name",
    flex: 1,
    renderCell: (params) => (
      <span style={{ fontSize: "0.875rem" }}>{params.value}</span>
    ),
  },
  {
    field: "description",
    headerName: "Description",
    flex: 2,
    renderCell: (params) => (
      <span style={{ fontSize: "0.75rem", opacity: 0.45 }}>{params.value}</span>
    ),
  },
  {
    field: "server",
    headerName: "Server",
  },
];

function BuiltInToolsView() {
  const { data, isLoading } = useSWR<ToolsApiResponse>("/api/tools", fetcher);
  const tools = data?.tools ?? [];

  if (isLoading) return null;

  if (tools.length === 0) {
    return (
      <div className="flex flex-col gap-1 p-2">
        <div className="px-2 py-4 text-center text-sm opacity-50">No tools configured</div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <div className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wider opacity-50">Tools</div>
      <div style={{ height: tools.length * 44 + 40 }}>
        <DataGridPremium
          rows={tools}
          columns={toolColumns}
          density="compact"
          rowHeight={44}
          columnHeaderHeight={0}
          hideFooter
          disableColumnMenu
          disableRowSelectionOnClick
          disableRowGrouping
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: false,
              csvOptions: { allColumns: true },
              excelOptions: { allColumns: true },
              printOptions: { disableToolbarButton: true },
            },
          }}
          sx={{ ...toolsGridSx, ...toolbarSx } as any}
        />
      </div>
    </div>
  );
}

function McpToolsView() {
  const { data, isLoading } = useSWR<ToolsApiResponse>("/api/tools", fetcher);
  const mcpTools = data?.mcpTools ?? [];

  if (isLoading) return null;

  if (mcpTools.length === 0) {
    return (
      <div className="flex flex-col gap-1 p-2">
        <div className="px-2 py-4 text-center text-sm opacity-50">No MCP integrations configured</div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DataGridPremium
          rows={mcpTools}
          columns={mcpToolColumns}
          density="compact"
          rowHeight={44}
          columnHeaderHeight={42}
          hideFooter
          disableColumnMenu
          disableRowSelectionOnClick
          slots={{ toolbar: GridToolbar }}
          slotProps={{
            toolbar: {
              showQuickFilter: false,
              csvOptions: { allColumns: true },
              excelOptions: { allColumns: true },
              printOptions: { disableToolbarButton: true },
            },
          }}
          initialState={{
            rowGrouping: {
              model: ["server"],
            },
            columns: {
              columnVisibilityModel: {
                server: false,
              },
            },
          }}
          defaultGroupingExpansionDepth={0}
          groupingColDef={{
            headerName: "Server",
            flex: 1,
            hideDescendantCount: true,
          }}
          sx={{
            ...toolsGridSx,
            ...toolbarSx,
            "& .MuiDataGrid-columnHeaders": {
              display: "flex",
              background: "transparent",
              color: "var(--foreground) !important",
            },
            "& .MuiDataGrid-topContainer": {
              background: "transparent",
            },
            "& .MuiDataGrid-row--borderBottom": {
              borderBottom: "none !important",
              background: "transparent !important",
              "& .MuiDataGrid-columnHeader": {
                background: "transparent !important",
              },
            },
            "& .MuiDataGrid-sortIcon": {
              color: "var(--foreground) !important",
            },
            "& .MuiDataGrid-row--groupHeader": {
              minHeight: "40px !important",
              maxHeight: "40px !important",
            },
            "& .MuiDataGrid-row--groupHeader .MuiDataGrid-cell": {
              minHeight: "40px !important",
              maxHeight: "40px !important",
              lineHeight: "40px",
            },
            "& .MuiDataGrid-groupingCriteriaCell": {
              fontSize: "0.8rem",
              fontWeight: "600 !important",
            },
            "& .MuiDataGrid-groupingCriteriaCellToggle .MuiIconButton-root": {
              color: "var(--foreground) !important",
            },
          } as any}
        />
      </div>
    </div>
  );
}

// --- Main component ---

type NavView = "chats" | "model" | "tools" | "mcp" | "appearance" | "signin";

export default function NavPanelContent({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedModel, setSelectedModel } = useModel();

  const [view, setView] = useState<NavView>("chats");
  const [menuOpen, setMenuOpen] = useState(false);

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
    () => chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      visibility: chat.visibility,
    })),
    [chats]
  );

  // --- Delete single chat ---
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const columns: GridColDef[] = useMemo(
    () => [
      {
        field: "createdAt",
        headerName: "When",
        width: 100,
        sortable: true,
        renderCell: (params) => {
          const date = new Date(params.value);
          const now = new Date();
          const diffMs = now.getTime() - date.getTime();
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);
          let label: string;
          if (diffMins < 1) label = "just now";
          else if (diffMins < 60) label = `${diffMins}m ago`;
          else if (diffHours < 24) label = `${diffHours}h ago`;
          else if (diffDays < 7) label = `${diffDays}d ago`;
          else label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
          return (
            <span style={{ fontSize: "0.75rem", opacity: 0.5 }}>
              {label}
            </span>
          );
        },
      },
      {
        field: "title",
        headerName: "Title",
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
      {
        field: "visibility",
        headerName: "Visibility",
        width: 80,
        sortable: true,
        renderCell: (params) => (
          <span style={{ fontSize: "0.75rem", opacity: 0.5, textTransform: "capitalize" }}>
            {params.value}
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


  const viewLabel = view === "chats" ? "Chats" : "Model";
  const selectedModelLabel = MODELS.find((m) => m.id === selectedModel)?.label ?? "Claude Opus 4.6";

  // Sync view, menu state, and model label to <html> so the global bottom bar script can read them
  useEffect(() => {
    document.documentElement.dataset.navView = view;
    document.documentElement.dataset.navModelLabel = selectedModelLabel;
    document.documentElement.dataset.navMenuOpen = String(menuOpen);
  }, [view, selectedModelLabel, menuOpen]);

  // Listen for 'toggle-nav-menu' dispatched by the global bottom bar
  useEffect(() => {
    const handler = () => setMenuOpen((v) => !v);
    window.addEventListener('toggle-nav-menu', handler);
    return () => window.removeEventListener('toggle-nav-menu', handler);
  }, []);

  return (
    <>
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 overflow-hidden p-2">
          {menuOpen ? (
            /* Menu view — DataGrid nav replaces content when toggled from bottom bar */
            <div style={{ height: 6 * 44, width: "100%" }}>
              <DataGridPremium
                rows={[
                  { id: "chats", label: "Chats", detail: view === "chats" ? "\u2713" : "" },
                  { id: "model", label: "Model", detail: selectedModelLabel },
                  { id: "tools", label: "Tools", detail: view === "tools" ? "\u2713" : "" },
                  { id: "mcp", label: "MCP", detail: view === "mcp" ? "\u2713" : "" },
                  { id: "appearance", label: "Appearance", detail: view === "appearance" ? "\u2713" : "" },
                  { id: "signin", label: "Sign In", detail: view === "signin" ? "\u2713" : "" },
                ]}
                columns={menuColumns}
                density="compact"
                rowHeight={44}
                columnHeaderHeight={0}
                hideFooter
                disableColumnMenu
                disableRowSelectionOnClick
                disableRowGrouping
                onRowClick={(params) => {
                  setView(params.row.id as NavView);
                  setMenuOpen(false);
                }}
                getRowClassName={(params) =>
                  params.row.id === view ? "active-menu-row" : ""
                }
                sx={{
                  ...toolsGridSx,
                  cursor: "pointer",
                  "& .MuiDataGrid-row": {
                    ...((toolsGridSx as any)["& .MuiDataGrid-row"]),
                    cursor: "pointer",
                  },
                  "& .active-menu-row": {
                    background: "rgba(255,255,255,0.08) !important",
                  },
                } as any}
              />
            </div>
          ) : view === "chats" ? (
            /* Chat history view */
            <div style={{ height: "100%", width: "100%", display: "flex", flexDirection: "column" }}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-white/10"
                onClick={() => {
                  router.push("/");
                  onNavigate();
                }}
              >
                <PlusIcon size={16} />
                <span className="flex-1">New Chat</span>
              </button>
              {isLoading ? null : hasEmptyChatHistory ? (
                <div className="px-2 py-4 text-center text-sm text-black dark:text-white">
                  No chats yet
                </div>
              ) : (
              <div style={{ flex: 1, minHeight: 0 }}>
                <DataGridPremium
                  rows={rows}
                  columns={columns}
                  density="standard"
                  rowHeight={52}
                  columnHeaderHeight={42}
                  hideFooter
                  disableColumnMenu
                  disableRowSelectionOnClick
                  disableRowGrouping
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: false,
                      csvOptions: { allColumns: true },
                      excelOptions: { allColumns: true },
                      printOptions: { disableToolbarButton: false },
                    },
                  }}
                  initialState={{
                    columns: {
                      columnVisibilityModel: {
                        visibility: false,
                      },
                    },
                  }}
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
                    ...toolbarSx,
                    backgroundColor: "transparent",
                    color: "var(--foreground)",
                    border: "none",
                    "--DataGrid-cellOffsetMultiplier": 0,
                    "& .MuiDataGrid-columnHeaders": {
                      background: "transparent",
                      color: "var(--foreground) !important",
                    },
                    "& .MuiDataGrid-topContainer": {
                      background: "transparent",
                    },
                    "& .MuiDataGrid-row--borderBottom": {
                      borderBottom: "none !important",
                      background: "transparent !important",
                      "& .MuiDataGrid-columnHeader": {
                        background: "transparent !important",
                      },
                    },
                    "& .MuiDataGrid-sortIcon": {
                      color: "var(--foreground) !important",
                    },
                    "& .MuiDataGrid-iconButtonContainer": {
                      background: "transparent !important",
                      "& .MuiIconButton-root": {
                        background: "transparent !important",
                        color: "var(--foreground) !important",
                      },
                    },
                    "& .MuiDataGrid-row": {
                      minHeight: "52px !important",
                      maxHeight: "52px !important",
                      cursor: "pointer",
                      "&:hover": { background: "transparent !important" },
                      "&.active-chat-row": { background: "transparent !important" },
                    },
                    "& .MuiDataGrid-cell": {
                      minHeight: "52px !important",
                      maxHeight: "52px !important",
                      lineHeight: "52px",
                      padding: "0 8px",
                      border: "none",
                    },
                    "& .MuiDataGrid-row *": { fontWeight: "400 !important" },
                    "& .MuiDataGrid-withBorderColor": { borderColor: "transparent" },
                  } as any}
                />
              </div>
              )}
            </div>
          ) : view === "model" ? (
            /* Model picker view */
            <div className="flex flex-col gap-1 p-2">
              <div className="px-2 pb-2 text-xs font-medium uppercase tracking-wider opacity-50">
                Select Model
              </div>
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-white/10"
                  style={{
                    background: model.id === selectedModel ? "rgba(255,255,255,0.08)" : "transparent",
                  }}
                  onClick={() => {
                    setSelectedModel(model.id);
                    setView("chats");
                  }}
                >
                  <span className="flex-1">{model.label}</span>
                  {model.id === selectedModel && (
                    <span className="text-xs opacity-60">&#10003;</span>
                  )}
                </button>
              ))}
            </div>
          ) : view === "tools" ? (
            /* Built-in tools view */
            <BuiltInToolsView />
          ) : view === "mcp" ? (
            /* MCP integrations view */
            <McpToolsView />
          ) : view === "appearance" ? (
            /* Appearance view */
            <div className="flex flex-col gap-1 p-2">
              <div className="px-2 pb-2 text-xs font-medium uppercase tracking-wider opacity-50">
                Appearance
              </div>
              <div className="px-2 py-4 text-center text-sm opacity-50">
                Coming soon
              </div>
            </div>
          ) : (
            /* Sign in view */
            <div className="flex flex-col gap-1 p-2">
              <div className="px-2 pb-2 text-xs font-medium uppercase tracking-wider opacity-50">
                Sign In
              </div>
              <div className="px-2 py-4 text-center text-sm opacity-50">
                Coming soon
              </div>
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
