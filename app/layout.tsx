import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";

import "./globals.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  metadataBase: new URL("https://a.baronbegier.com"),
  title: {
    default: "AI Chat",
    template: "%s",
  },
  description: "AI Chat",
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  maximumScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(0 0% 100%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(240deg 10% 3.92%)" },
  ],
};

const THEME_INIT_SCRIPT = `\
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
    }
    var d = (t === 'dark') || (t !== 'light' && window.matchMedia('(prefers-color-scheme:dark)').matches);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', d ? 'hsl(240deg 10% 3.92%)' : 'hsl(0 0% 100%)');
  } catch(e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required for theme init before paint"
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <Toaster position="top-center" />
        <SessionProvider>{children}</SessionProvider>
        <div id="bottom-bar" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '36px',
          backgroundColor: 'transparent',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--foreground)',
        }}>
          <div style={{ width: '100%', maxWidth: '896px', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <a id="bb-text" href="https://baronbegier.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '16px', color: 'var(--foreground)', textDecoration: 'none' }}>baronbegier.com</a>
            <a id="bb-chevron" href="#" style={{ display: 'none', opacity: 0.5, color: 'inherit', lineHeight: 0 }}>
              <svg width="18" height="18" viewBox="0 0 17.3242 10.4004" fill="currentColor">
                <path d="M8.48633 10.4004C8.73047 10.4004 8.97461 10.3027 9.14062 10.1172L16.6992 2.37305C16.8652 2.20703 16.9629 1.99219 16.9629 1.74805C16.9629 1.24023 16.582 0.849609 16.0742 0.849609C15.8301 0.849609 15.6055 0.947266 15.4395 1.10352L7.95898 8.75L9.00391 8.75L1.52344 1.10352C1.36719 0.947266 1.14258 0.849609 0.888672 0.849609C0.380859 0.849609 0 1.24023 0 1.74805C0 1.99219 0.0976562 2.20703 0.263672 2.38281L7.82227 10.1172C8.00781 10.3027 8.23242 10.4004 8.48633 10.4004Z"/>
              </svg>
            </a>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var bar = document.getElementById('bottom-bar');
  var text = document.getElementById('bb-text');
  var chevron = document.getElementById('bb-chevron');
  var lastPath = '';
  // var clicked = !!localStorage.getItem('bb-clicked');
  // if (clicked) text.style.display = 'none';
  // text.addEventListener('click', function() {
  //   localStorage.setItem('bb-clicked', '1');
  //   clicked = true;
  //   text.style.display = 'none';
  // });
  var clicked = false;
  function updateHref() {
    if (location.pathname === lastPath) return;
    lastPath = location.pathname;
    var id = location.pathname.replace(/^\\//, '');
    text.href = id ? 'https://baronbegier.com?c=' + encodeURIComponent(id) : 'https://baronbegier.com';
  }
  function update() {
    var navOpen = document.documentElement.dataset.navPanelOpen === 'true';
    if (navOpen) {
      var navView = document.documentElement.dataset.navView || 'chats';
      var modelLabel = document.documentElement.dataset.navModelLabel || '';
      text.style.display = '';
      text.removeAttribute('href');
      text.removeAttribute('target');
      text.style.color = 'var(--foreground)';
      text.style.cursor = 'default';
      var menuIsOpen = document.documentElement.dataset.navMenuOpen === 'true';
      if (menuIsOpen) { text.textContent = 'menu'; chevron.style.display = 'none'; return; }
      var viewLabels = { chats: 'chats', model: modelLabel.toLowerCase(), tools: 'tools', mcp: 'mcp', appearance: 'appearance', signin: 'sign in' };
      text.textContent = viewLabels[navView] || navView;
      chevron.style.display = 'none';
      return;
    }
    text.style.color = 'var(--foreground)';
    text.style.cursor = '';
    text.textContent = 'baronbegier.com';
    text.href = 'https://baronbegier.com';
    text.target = '_blank';
    bar.style.display = 'flex';
    var scrolledUp = document.documentElement.dataset.chatAtBottom === 'false';
    text.style.display = (scrolledUp || clicked) ? 'none' : '';
    chevron.style.display = scrolledUp ? '' : 'none';
    updateHref();
  }
  requestAnimationFrame(function() { updateHref(); });
  bar.addEventListener('click', function(e) {
    if (document.documentElement.dataset.navPanelOpen === 'true') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('toggle-nav-menu'));
      return;
    }
    if (document.documentElement.dataset.chatAtBottom === 'false') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('scroll-chat-to-bottom'));
    }
  });
  window.addEventListener('toggle-nav-panel', function() { setTimeout(update, 0); });
  window.addEventListener('popstate', updateHref);
  var _pushState = history.pushState;
  history.pushState = function() { _pushState.apply(this, arguments); updateHref(); };
  var _replaceState = history.replaceState;
  history.replaceState = function() { _replaceState.apply(this, arguments); updateHref(); };
  var observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-chat-at-bottom', 'data-nav-panel-open', 'data-nav-view', 'data-nav-model-label', 'data-nav-menu-open'] });
})();
        `}} />
      </body>
    </html>
  );
}
