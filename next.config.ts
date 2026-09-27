import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

const version = JSON.parse(readFileSync("package.json", "utf8")).version as string;

// Only our own origin may run code, load data or frame the app. Inline scripts stay allowed for Next's bootstrap
// (ponytail: per-request nonces in proxy.ts to drop 'unsafe-inline'). Dev needs eval for fast refresh: production only.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  env: { NEXT_PUBLIC_VERSION: version },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: csp }] : []),
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=()" }, // the table's ear
        ],
      },
    ];
  },
};

export default nextConfig;
