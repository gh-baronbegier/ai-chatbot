import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://a.baronbegier.com"),
  title: {
    default: "Agent",
    template: "%s",
  },
  description: "Agent",
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Agent",
    description: "Agent",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/opengraph-image"],
  },
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
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: "Required for theme init before paint"
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
      </head>
      <body className="antialiased">
        {children}

        <div
          id="bottom-bar"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            height: "36px",
            backgroundColor: "transparent",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--foreground)",
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "896px",
              padding: "0 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <a
              id="bb-text"
              href="https://baronbegier.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: "16px", color: "inherit", textDecoration: "none" }}
            >
              baronbegier.com
            </a>
            <a
              id="bb-chevron"
              href="#"
              style={{
                display: "none",
                opacity: 1,
                color: "inherit",
                lineHeight: 0,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 17.3242 10.4004"
                fill="currentColor"
              >
                <path d="M8.48633 10.4004C8.73047 10.4004 8.97461 10.3027 9.14062 10.1172L16.6992 2.37305C16.8652 2.20703 16.9629 1.99219 16.9629 1.74805C16.9629 1.24023 16.582 0.849609 16.0742 0.849609C15.8301 0.849609 15.6055 0.947266 15.4395 1.10352L7.95898 8.75L9.00391 8.75L1.52344 1.10352C1.36719 0.947266 1.14258 0.849609 0.888672 0.849609C0.380859 0.849609 0 1.24023 0 1.74805C0 1.99219 0.0976562 2.20703 0.263672 2.38281L7.82227 10.1172C8.00781 10.3027 8.23242 10.4004 8.48633 10.4004Z" />
              </svg>
            </a>
          </div>
        </div>

        <script src="/ui-shell.v2.js" defer />
      </body>
    </html>
  );
}
