// Shared DataGrid sx constants — spread into consumer sx props

import type { SxProps, Theme } from "@mui/material/styles";

/** border:none, column separator hidden, cell focus outline removed, borderColor transparent */
export const dataGridBaseSx: SxProps<Theme> = {
  border: "none",
  "& .MuiDataGrid-cell:focus": { outline: "none" },
  "& .MuiDataGrid-cell:focus-within": { outline: "none" },
  "& .MuiDataGrid-columnSeparator": { display: "none" },
  "& *": { borderColor: "transparent !important" },
};

/** transparent bg on container, headers, filler, scroller, topContainer */
export const dataGridTransparentSx: SxProps<Theme> = {
  background: "transparent",
  "& .MuiDataGrid-columnHeaders": { background: "transparent" },
  "& .MuiDataGrid-columnHeader": { background: "transparent" },
  "& .MuiDataGrid-row": { background: "transparent" },
  "& .MuiDataGrid-filler": { background: "transparent" },
  "& .MuiDataGrid-virtualScroller": { background: "transparent" },
  "& .MuiDataGrid-topContainer": { background: "transparent" },
};

/** root/main/mainContent/headerRow/bottomContainer transparent, borderBottom/borderColor none */
export const dataGridDeepTransparentSx: SxProps<Theme> = {
  "& .MuiDataGrid-root": { background: "transparent" },
  "& .MuiDataGrid-main": { background: "transparent" },
  "& .MuiDataGrid-mainContent": { background: "transparent" },
  "& .MuiDataGrid-columnHeaderRow": {
    background: "transparent",
    border: "none",
  },
  "& .MuiDataGrid-bottomContainer": { background: "transparent" },
  "& .MuiDataGrid-row--borderBottom": { border: "none" },
  "& .MuiDataGrid-withBorderColor": { border: "none" },
  "& .MuiDataGrid-topContainer": { border: "none" },
  "& .MuiDataGrid-columnHeaders": { border: "none" },
  "& .MuiDataGrid-columnHeader": { border: "none" },
};

/** DataGrid CSS custom properties for transparent theming */
export const dataGridTransparentVarsSx: SxProps<Theme> = {
  "--DataGrid-t-header-background-base": "transparent",
  "--DataGrid-t-color-background-base": "transparent",
  "--DataGrid-t-color-border-base": "transparent",
  "--DataGrid-t-cell-background-pinned": "transparent",
};

/** theme-aware text using CSS variables */
export const dataGridWhiteTextSx: SxProps<Theme> = {
  color: "var(--foreground) !important",
  "& .MuiDataGrid-columnHeaders": { color: "inherit" },
  "& .MuiDataGrid-columnHeader": { color: "inherit" },
  "& .MuiDataGrid-columnHeaderTitle": { color: "inherit" },
  "& .MuiDataGrid-cell": { color: "var(--foreground) !important", border: "none" },
  "& .MuiDataGrid-cell *": { color: "var(--foreground) !important" },
  "& .MuiDataGrid-row": { color: "var(--foreground) !important" },
  "& .MuiDataGrid-virtualScroller": { color: "var(--foreground) !important" },
};
