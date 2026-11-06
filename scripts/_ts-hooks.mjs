// Resolve hook so plain Node can load the app's TypeScript modules the way webpack does:
// extensionless relative imports ("./refcode") and the "@/" alias for src/.
const EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx", ".mjs", ".js"];

export async function resolve(specifier, context, next) {
  const tryAll = async (base) => {
    for (const ext of EXTS) {
      try {
        return await next(base + ext, context);
      } catch {
        /* try the next extension */
      }
    }
    return null;
  };

  if (specifier.startsWith("@/")) {
    const base = new URL(`../src/${specifier.slice(2)}`, import.meta.url).href;
    const hit = (await tryAll(base)) ?? (await next(base, context).catch(() => null));
    if (hit) return hit;
  }
  // Next ships these as files, and Node (unlike webpack) wants the extension.
  if (/^next\/[a-z-]+$/.test(specifier)) {
    const hit = await next(`${specifier}.js`, context).catch(() => null);
    if (hit) return hit;
  }
  if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) {
    const hit = await tryAll(specifier);
    if (hit) return hit;
  }
  return next(specifier, context);
}
