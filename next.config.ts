// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin must NOT be bundled by Next.js — it's a server-only CJS package
  serverExternalPackages: ["firebase-admin", "@google-cloud/firestore", "undici"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "media.api-sports.io" },
      { protocol: "https", hostname: "**.api-sports.io" },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/cron/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
