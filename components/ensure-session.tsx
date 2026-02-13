"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __ensureGuestSessionOnce?: boolean;
  }
}

export function EnsureSession() {
  useEffect(() => {
    if (window.__ensureGuestSessionOnce) return;
    window.__ensureGuestSessionOnce = true;

    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;

        const session = await res.json();
        if (cancelled) return;
        if (session?.user) return;

        const { signIn } = await import("next-auth/react");
        if (cancelled) return;

        await signIn("guest", { redirect: false });
      } catch {
        // Guest session bootstrap is best-effort.
      }
    };

    // Schedule after paint, during idle time.
    const w = window as unknown as {
      requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => {
        if (!cancelled) run();
      }, { timeout: 4000 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }

    const t = window.setTimeout(() => {
      if (!cancelled) run();
    }, 1);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  return null;
}
