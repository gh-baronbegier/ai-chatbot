import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,

  // React Compiler disabled to speed up builds.
  reactCompiler: false,

  poweredByHeader: false,

  turbopack: {
    root: __dirname,
  },

  // Strip console.log in production (keep console.error).
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  experimental: {
    // Inline CSS into HTML to remove render-blocking stylesheet request.
    // Tradeoff: bigger HTML. Enable via env var to test.
    ...(process.env.INLINE_CSS === "1" ? { inlineCss: true } : {}),

    // Tree-shake barrel exports for heavy packages.
    optimizePackageImports: [
      "@mui/x-data-grid-premium",
      "@mui/material",
      "@emotion/react",
      "@emotion/styled",
      "@xyflow/react",
      "shiki",
      "lucide-react",
      "@icons-pack/react-simple-icons",
      "date-fns",
      "react-syntax-highlighter",
    ],
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        //https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/ui-shell.v1.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
