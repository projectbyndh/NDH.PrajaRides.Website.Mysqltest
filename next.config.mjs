// Plain JavaScript and a plain object on purpose: the config loads the same way on every host
// (no TypeScript compile step, nothing for a platform wrapper to lose). Tailwind runs through the
// standard PostCSS setup (postcss.config.mjs). Build-time checks live in scripts/check-build.mjs.

// Sent with every response. The site runs on its own Node server (next start) behind nginx.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  // Lets nginx pass streamed pages through as they render instead of buffering them.
  { key: "X-Accel-Buffering", value: "no" },
];

/** @type {import("next").NextConfig} */
const nextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // The QR image route reads fonts and the tagline outlines from assets/ at runtime.
  outputFileTracingIncludes: {
    "/qr/[driverId]/image": ["./assets/**/*"],
  },
  partialPrefetching: true,
  images: {
    // Every image is served by the site itself from object storage (/media/...). Website images can be
    // replaced in admin, so optimised copies are re-checked every 15 minutes.
    minimumCacheTTL: 900,
  },
  experimental: {
    // Driver applications carry up to 6 photos, resized to WebP in the browser.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
