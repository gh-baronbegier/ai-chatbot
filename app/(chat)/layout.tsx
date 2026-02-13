import { DataStreamProvider } from "@/components/data-stream-provider";
import { EnsureSession } from "@/components/ensure-session";
import { LazyToaster } from "@/components/lazy-toaster";
import { ModelProvider } from "@/components/model-provider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DataStreamProvider>
      <ModelProvider>
        {children}
        <EnsureSession />
        <LazyToaster />
      </ModelProvider>

      <div
        id="sidebar-top-bar"
        data-nav-toggle
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "36px",
          backgroundColor: "transparent",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        aria-label="Toggle navigation panel"
        role="button"
        tabIndex={0}
      >
        <svg id="topbar-menu" width="24" height="24" viewBox="0 0 18 18">
          <polyline
            fill="none"
            stroke="black"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="2 12, 16 12"
            className="stroke-black dark:stroke-white"
          />
          <polyline
            fill="none"
            stroke="black"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="2 5, 16 5"
            className="stroke-black dark:stroke-white"
          />
        </svg>
        <svg
          id="topbar-close"
          width="24"
          height="24"
          viewBox="0 0 18 18"
          style={{ display: "none" }}
        >
          <polyline
            fill="none"
            stroke="black"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="3.5 15, 15 3.5"
            className="stroke-black dark:stroke-white"
          />
          <polyline
            fill="none"
            stroke="black"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="3.5 3.5, 15 15"
            className="stroke-black dark:stroke-white"
          />
        </svg>
      </div>
    </DataStreamProvider>
  );
}
