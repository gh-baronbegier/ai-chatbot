import type { Metadata } from "next";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";

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

export const viewport = {
  maximumScale: 1, // Disable auto-zoom on mobile Safari
};

const LIGHT_THEME_COLOR = "hsl(0 0% 100%)";
const DARK_THEME_COLOR = "hsl(240deg 10% 3.92%)";
const THEME_COLOR_SCRIPT = `\
(function() {
  var html = document.documentElement;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  function updateThemeColor() {
    var isDark = html.classList.contains('dark');
    meta.setAttribute('content', isDark ? '${DARK_THEME_COLOR}' : '${LIGHT_THEME_COLOR}');
  }
  var observer = new MutationObserver(updateThemeColor);
  observer.observe(html, { attributes: true, attributeFilter: ['class'] });
  updateThemeColor();
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      // `next-themes` injects an extra classname to the body element to avoid
      // visual flicker before hydration. Hence the `suppressHydrationWarning`
      // prop is necessary to avoid the React hydration mismatch warning.
      // https://github.com/pacocoursey/next-themes?tab=readme-ov-file#with-app
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required"
          dangerouslySetInnerHTML={{
            __html: THEME_COLOR_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          disableTransitionOnChange
          enableSystem
        >
          <Toaster position="top-center" />
          <SessionProvider>{children}</SessionProvider>
        </ThemeProvider>
        <a id="bottom-bar" href="https://baronbegier.com" target="_blank" rel="noopener noreferrer" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '36px',
          backgroundColor: 'transparent',
          zIndex: 9999,
          display: 'none',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <svg id="bb-phone" width="24" height="24" viewBox="0 0 12.9102 20.6934" fill="white">
            <path d="M2.65625 20.6738L9.89258 20.6738C11.4844 20.6738 12.5488 19.6582 12.5488 18.1348L12.5488 2.53906C12.5488 1.01562 11.4844 0 9.89258 0L2.65625 0C1.06445 0 0 1.01562 0 2.53906L0 18.1348C0 19.6582 1.06445 20.6738 2.65625 20.6738ZM2.86133 19.1016C2.03125 19.1016 1.57227 18.6621 1.57227 17.8809L1.57227 2.79297C1.57227 2.01172 2.03125 1.57227 2.86133 1.57227L9.69727 1.57227C10.5176 1.57227 10.9766 2.01172 10.9766 2.79297L10.9766 17.8809C10.9766 18.6621 10.5176 19.1016 9.69727 19.1016ZM4.20898 18.3887L8.35938 18.3887C8.62305 18.3887 8.80859 18.2031 8.80859 17.9297C8.80859 17.6562 8.62305 17.4805 8.35938 17.4805L4.20898 17.4805C3.94531 17.4805 3.75 17.6562 3.75 17.9297C3.75 18.2031 3.94531 18.3887 4.20898 18.3887ZM5.09766 3.64258L7.46094 3.64258C7.8418 3.64258 8.14453 3.33984 8.14453 2.94922C8.14453 2.56836 7.8418 2.26562 7.46094 2.26562L5.09766 2.26562C4.70703 2.26562 4.4043 2.56836 4.4043 2.94922C4.4043 3.33984 4.70703 3.64258 5.09766 3.64258Z"/>
          </svg>
          <svg id="bb-chevron" style={{ display: 'none' }} width="24" height="24" viewBox="0 0 17.3242 10.4004" fill="white">
            <path d="M8.48633 10.4004C8.73047 10.4004 8.97461 10.3027 9.14062 10.1172L16.6992 2.37305C16.8652 2.20703 16.9629 1.99219 16.9629 1.74805C16.9629 1.24023 16.582 0.849609 16.0742 0.849609C15.8301 0.849609 15.6055 0.947266 15.4395 1.10352L7.95898 8.75L9.00391 8.75L1.52344 1.10352C1.36719 0.947266 1.14258 0.849609 0.888672 0.849609C0.380859 0.849609 0 1.24023 0 1.74805C0 1.99219 0.0976562 2.20703 0.263672 2.38281L7.82227 10.1172C8.00781 10.3027 8.23242 10.4004 8.48633 10.4004Z"/>
          </svg>
        </a>
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
  var bar = document.getElementById('bottom-bar');
  var phone = document.getElementById('bb-phone');
  var chevron = document.getElementById('bb-chevron');
  function update() {
    var navOpen = document.documentElement.dataset.navPanelOpen === 'true';
    if (!navOpen) {
      bar.style.display = 'none';
      return;
    }
    bar.style.display = 'flex';
    var scrolledUp = document.documentElement.dataset.chatAtBottom === 'false';
    phone.style.display = scrolledUp ? 'none' : '';
    chevron.style.display = scrolledUp ? '' : 'none';
  }
  bar.addEventListener('click', function(e) {
    if (document.documentElement.dataset.chatAtBottom === 'false') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('scroll-chat-to-bottom'));
    }
  });
  window.addEventListener('toggle-nav-panel', function() { setTimeout(update, 0); });
  var observer = new MutationObserver(update);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-chat-at-bottom', 'data-nav-panel-open'] });
})();
        `}} />
      </body>
    </html>
  );
}
