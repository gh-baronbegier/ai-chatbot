"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
const LIGHT_COLOR = "hsl(0 0% 100%)";
const DARK_COLOR = "hsl(240deg 10% 3.92%)";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(STORAGE_KEY);
  if (val === "light" || val === "dark" || val === "system") return val;
  return null;
}

function getResolvedTheme(): "light" | "dark" {
  const stored = getStoredTheme();
  if (stored === "light" || stored === "dark") return stored;
  return getSystemTheme();
}

function syncMeta(resolved: "light" | "dark") {
  const color = resolved === "dark" ? DARK_COLOR : LIGHT_COLOR;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

export function applyTheme(theme: Theme) {
  const html = document.documentElement;

  if (theme === "system") {
    html.removeAttribute("data-theme");
    localStorage.removeItem(STORAGE_KEY);
  } else {
    html.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  syncMeta(getResolvedTheme());

  // Briefly disable transitions to avoid flash
  html.style.setProperty("transition", "none");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      html.style.removeProperty("transition");
    });
  });
}

// External store for useSyncExternalStore
let listeners = new Set<() => void>();

function notifyListeners() {
  for (const fn of listeners) fn();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Listen for system preference changes
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystemChange = () => {
    notifyListeners();
  };
  mql.addEventListener("change", onSystemChange);

  // Listen for cross-tab storage changes
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      notifyListeners();
    }
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(cb);
    mql.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): string {
  const stored = getStoredTheme();
  const resolved = getResolvedTheme();
  return `${stored ?? "system"}|${resolved}`;
}

function getServerSnapshot(): string {
  return "system|light";
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [theme, resolvedTheme] = snapshot.split("|") as [Theme, "light" | "dark"];

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t);
    notifyListeners();
  }, []);

  // Sync meta tag on mount and when resolved theme changes
  useEffect(() => {
    syncMeta(resolvedTheme);
  }, [resolvedTheme]);

  return { theme, resolvedTheme, setTheme } as const;
}
