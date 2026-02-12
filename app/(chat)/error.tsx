"use client";

import { useEffect } from "react";

export default function ChatGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Chat error:", error);
  }, [error]);

  return (
    <div className="flex h-dvh w-full flex-col items-center justify-center gap-4 bg-background text-foreground">
      <p className="text-sm text-muted-foreground">Something went wrong.</p>
      <button
        onClick={reset}
        className="text-sm text-muted-foreground hover:text-blue-500"
      >
        Try again
      </button>
    </div>
  );
}
