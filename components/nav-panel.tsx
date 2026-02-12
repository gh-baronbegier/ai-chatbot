"use client";

import { Suspense, lazy, useEffect, useRef } from "react";

const NavPanelContent = lazy(() => import("./nav-panel-content"));

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
      className={`mt-[0.375rem] flex flex-1 flex-col overflow-hidden
        border border-white/[0.01] bg-background${isOpen ? "" : " hidden"}`}
    >
      {isOpen && (
        <Suspense fallback={<NavPanelSkeleton />}>
          <NavPanelContent onNavigate={onClose} />
        </Suspense>
      )}
    </div>
  );
}

function NavPanelSkeleton() {
  return (
    <div className="p-2">
      <div className="px-2 py-1 text-xs text-black/50 dark:text-white/50">Today</div>
      <div className="flex flex-col">
        {[44, 32, 28, 64, 52].map((item) => (
          <div
            className="flex h-8 items-center gap-2 rounded-md px-2"
            key={item}
          >
            <div
              className="h-4 max-w-(--skeleton-width) flex-1 rounded-md bg-black/10 dark:bg-white/10"
              style={
                {
                  "--skeleton-width": `${item}%`,
                } as React.CSSProperties
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
