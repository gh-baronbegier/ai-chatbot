// import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { EnsureSession } from "@/components/ensure-session";
import { ModelProvider } from "@/components/model-provider";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <DataStreamProvider>
      <SidebarProvider defaultOpen={false}>
        <ModelProvider>
          {/* <AppSidebar /> */}
          {children}
          <EnsureSession />
        </ModelProvider>
      </SidebarProvider>
      <div
        id="sidebar-top-bar"
        data-nav-toggle
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '36px',
          backgroundColor: 'transparent',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <svg id="topbar-menu" width="24" height="24" viewBox="0 0 18 18">
          <polyline fill="none" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points="2 12, 16 12" className="stroke-black dark:stroke-white" />
          <polyline fill="none" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points="2 5, 16 5" className="stroke-black dark:stroke-white" />
        </svg>
        <svg id="topbar-close" width="24" height="24" viewBox="0 0 18 18" style={{ display: 'none' }}>
          <polyline fill="none" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points="3.5 15, 15 3.5" className="stroke-black dark:stroke-white" />
          <polyline fill="none" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points="3.5 3.5, 15 15" className="stroke-black dark:stroke-white" />
        </svg>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          var bar = document.getElementById('sidebar-top-bar');
          var menuIcon = document.getElementById('topbar-menu');
          var closeIcon = document.getElementById('topbar-close');
          function syncIcons() {
            var open = document.documentElement.dataset.navPanelOpen === 'true';
            menuIcon.style.display = open ? 'none' : '';
            closeIcon.style.display = open ? '' : 'none';
          }
          bar.addEventListener('click', function() {
            window.dispatchEvent(new CustomEvent('toggle-nav-panel'));
          });
          var observer = new MutationObserver(syncIcons);
          observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-nav-panel-open'] });
        })();
      `}} />
    </DataStreamProvider>
  );
}
