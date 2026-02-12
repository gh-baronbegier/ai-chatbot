"use client";

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";

export function EnsureSession() {
  const { status, update } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") {
      signIn("guest", { redirect: false })
        .then(() => update())
        .catch((err) => console.error("Guest sign-in failed:", err));
    }
  }, [status, update]);

  return null;
}
