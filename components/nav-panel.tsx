"use client";

import { Suspense, useEffect, useRef } from "react";
import NavPanelContent from "./nav-panel-content";

interface NavPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NavPanel({ isOpen, onClose }: NavPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Click outside (deferred to avoid closing on the opening click)
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-nav-toggle]")) return;
      if (target.closest("[data-radix-popper-content-wrapper]")) return;
      if (target.closest("#bottom-bar")) return;
      if (panelRef.current && !panelRef.current.contains(target)) onClose();
    };
    const timer = setTimeout(
      () => document.addEventListener("mousedown", handler),
      0
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [isOpen, onClose]);

  return (
    <div
      ref={panelRef}
      className="mt-[0.375rem] flex flex-1 flex-col overflow-hidden bg-background"
    >
      <Suspense fallback={null}>
        <NavPanelContent onNavigate={onClose} />
      </Suspense>
    </div>
  );
}
