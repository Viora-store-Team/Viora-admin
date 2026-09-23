import type { NextConfig } from "next";
import path from "path";

/*
  ما في redirects هون — بلوحة التاجر الجذر `/` بيروح على `/dashboard`،
  أما هون الجذر **هو** صفحة النظرة العامة (src/app/(panel)/page.tsx).
*/
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "default-src 'self'; script-src 'self' 'unsafe-inline'" + (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") + "; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' " + new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "https://viora-backend-tuqg.onrender.com/api").origin + (process.env.NODE_ENV === "development" ? " ws: wss:" : "") + "; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.166.17.209"],
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
