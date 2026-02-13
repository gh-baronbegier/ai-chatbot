"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Toaster = dynamic(() => import("sonner").then((m) => m.Toaster), {
  ssr: false,
});

export function LazyToaster() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const w = window as unknown as {
      requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number;
    };

    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setShow(true), { timeout: 2500 });
      return () => (window as any).cancelIdleCallback?.(id);
    }

    const t = window.setTimeout(() => setShow(true), 500);
    return () => clearTimeout(t);
  }, []);

  return show ? <Toaster position="top-center" /> : null;
}
