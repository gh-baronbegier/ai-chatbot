import { DataStreamProvider } from "@/components/data-stream-provider";
import { EnsureSession } from "@/components/ensure-session";
import { ModelProvider } from "@/components/model-provider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DataStreamProvider>
      <ModelProvider>
        {children}
        <EnsureSession />
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
        <svg id="topbar-menu" width="24" height="24" viewBox="0 0 18 18" className="text-black dark:text-white">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="2 12, 16 12"
          />
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points="2 5, 16 5"
          />
        </svg>
      </div>
    </DataStreamProvider>
  );
}
