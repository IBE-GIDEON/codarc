import type { NextConfig } from "next";

/**
 * Security headers on every response. None of these change how Codarc looks
 * or works; they stop other sites from misusing it:
 * - it can't be framed inside someone else's page (clickjacking)
 * - browsers won't guess a file's type and run it as a script
 * - full addresses (with repo names) aren't leaked to other sites
 * - no camera, microphone or location, ever
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
