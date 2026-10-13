/** @type {import('next').NextConfig} */
// Content-Security-Policy. A per-request nonce (the strictest option) would
// force every page, including the static public site, to render dynamically,
// so this is a static policy instead. 'unsafe-inline' is required for the
// inline bootstrap/hydration scripts and style tags Next.js emits; everything
// else is locked to the app's own origin. The app loads no third-party
// scripts, fonts, frames or images (verified in a real browser, see e2e/).
// 'unsafe-eval' is only added for `next dev` (React debugging).
const isDev = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Only meaningful over HTTPS; browsers ignore it on plain HTTP.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" }]
    : []),
];

const nextConfig = {
  // Don't advertise the framework on every response.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
