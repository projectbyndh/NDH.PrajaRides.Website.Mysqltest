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
  // Scope hoisting is turned off for the SERVER bundle only.
  //
  // Where the native SWC compiler cannot load - a build container whose glibc is older than 2.29,
  // which is the case on this host - Next falls back to its WebAssembly compiler. Webpack's module
  // concatenation then cannot work out the final name of a re-exported binding and the build stops:
  //   Cannot get final name for export 'ImageResponse' of next/dist/server/og/image-response.js
  // Disabling concatenation removes that step. It costs nothing a visitor can measure: the server
  // bundle is never downloaded by a browser, only required by Node, so this is bundle size and
  // startup only - and the client bundle keeps its optimisation.
  webpack(config, { isServer }) {
    if (isServer) config.optimization = { ...config.optimization, concatenateModules: false };
    return config;
  },
};

export default nextConfig;
