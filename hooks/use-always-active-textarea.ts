"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __disableChatFocus?: boolean;
  }
}

const TEXT_INPUT_SELECTOR =
  'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="file"]):not([type="image"]):not([type="hidden"]), textarea, select, [contenteditable="true"]';

export function useAlwaysActiveTextarea(
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  options: { disabled?: boolean } = {}
) {
  const { disabled = false } = options;

  useEffect(() => {
    if (disabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (window.__disableChatFocus) return;
      if (document.activeElement === textareaRef.current) return;
      if (document.activeElement?.matches(TEXT_INPUT_SELECTOR)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const isPrintable = e.key.length === 1;
      const isEditKey = e.key === "Backspace" || e.key === "Delete";
      if (!isPrintable && !isEditKey) return;

      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) return;

      textareaRef.current?.focus();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [textareaRef, disabled]);
}
