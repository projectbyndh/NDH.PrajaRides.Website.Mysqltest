import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { AwsClient } from "aws4fetch";

// Object storage (Contabo, S3-compatible) for every image on the site. The bucket is private:
// images are read here with signed requests and served through the site's own routes
// (/media/<id>, /media/site/<slot>, /admin/applications/photo/<id>).
//
// Keys live under OBJECT_STORAGE_BASE_PREFIX, e.g. "nepcab-shared-assets/photos/<id>/full.webp".

type Config = { client: AwsClient; base: string; prefix: string };

let cached: Config | null | undefined;

function config(): Config | null {
  if (cached !== undefined) return cached;
  const endpoint = process.env.OBJECT_STORAGE_ENDPOINT;
  const bucket = process.env.OBJECT_STORAGE_BUCKET;
  const accessKeyId = process.env.OBJECT_STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.OBJECT_STORAGE_SECRET_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return (cached = null);
  cached = {
    client: new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: process.env.OBJECT_STORAGE_REGION || "us-east-1" }),
    base: `${endpoint.replace(/\/$/, "")}/${bucket}`,
    prefix: (process.env.OBJECT_STORAGE_BASE_PREFIX ?? "").replace(/^\/|\/$/g, ""),
  };
  return cached;
}

export const storageConfigured = () => config() !== null;

function need(): Config {
  const c = config();
  if (!c) throw new Error("Object storage is not configured (OBJECT_STORAGE_* environment variables).");
  return c;
}

/** Full key for a path inside the site's prefix: "photos/<id>/full.webp" → "<prefix>/photos/<id>/full.webp". */
export function storageKey(path: string): string {
  const { prefix } = need();
  return prefix ? `${prefix}/${path.replace(/^\//, "")}` : path.replace(/^\//, "");
}

const url = (c: Config, key: string) => `${c.base}/${key.split("/").map(encodeURIComponent).join("/")}`;

export const extFor = (mime: string) => (mime === "image/webp" ? "webp" : mime === "image/png" ? "png" : "jpg");

// Uploads to the bucket occasionally stall for 20 s or more while most finish in a few seconds; a
// stalled attempt is cut off early and retried (PUT of the same key is safe to repeat). Allowed
// time: 8 s plus 1 s per 100 KB.
const putTimeout = (bytes: number) => Math.min(60_000, 8_000 + Math.ceil(bytes / 100_000) * 1_000);
const PUT_ATTEMPTS = 4;

export async function putObject(key: string, body: Uint8Array | Buffer, contentType: string): Promise<void> {
  const c = need();
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await c.client.fetch(url(c, key), {
        method: "PUT",
        body: new Uint8Array(body),
        headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
        signal: AbortSignal.timeout(putTimeout(body.length)),
      });
      if (res.ok) return;
      if (res.status < 500 || attempt >= PUT_ATTEMPTS) throw new Error(`Storage upload failed (${res.status}) for ${key}`);
    } catch (err) {
      const retryable = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError" || err instanceof TypeError);
      if (!retryable || attempt >= PUT_ATTEMPTS) throw err;
    }
    console.warn(`[storage] retrying upload of ${key} (attempt ${attempt + 1})`);
  }
}

// Reads are slow to start on this storage (often 2–8 s), so every object read is kept on the server's
// disk. Keys are unique per upload (a replaced image gets a new key), so a cached copy never goes
// stale; deleting an object removes its copy. The cache is capped (STORAGE_CACHE_MAX_MB, default
// 2048): when it grows past the cap, the least recently used files go first.
// Runtime folders, not part of the build: turbopackIgnore stops the bundler from treating these
// paths as project files (otherwise it traces the whole project into the server output).
const CACHE_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_CACHE_DIR || ".cache/storage");
const CACHE_MAX_BYTES = Number(process.env.STORAGE_CACHE_MAX_MB || 2048) * 1024 * 1024;
let cacheBytes: number | null = null; // measured lazily, then tracked
const inflight = new Map<string, Promise<{ bytes: Buffer; contentType: string } | null>>();

const cachePath = (key: string) => {
  const h = createHash("sha256").update(key).digest("hex");
  return path.join(CACHE_DIR, h.slice(0, 2), h);
};

async function readCache(key: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  const file = cachePath(key);
  try {
    const [bytes, contentType] = await Promise.all([readFile(file), readFile(`${file}.type`, "utf8")]);
    return { bytes, contentType };
  } catch {
    return null;
  }
}

async function writeCache(key: string, bytes: Buffer, contentType: string): Promise<void> {
  const file = cachePath(key);
  try {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(`${file}.type`, contentType);
    await writeFile(file, bytes);
    if (cacheBytes === null) cacheBytes = await cacheSize();
    cacheBytes += bytes.length;
    if (cacheBytes > CACHE_MAX_BYTES) await trimCache();
  } catch (err) {
    console.error("[storage] cache write failed:", err);
  }
}

async function cacheFiles(): Promise<{ file: string; size: number; used: number }[]> {
  const out: { file: string; size: number; used: number }[] = [];
  for (const dir of await readdir(CACHE_DIR).catch(() => [] as string[])) {
    for (const name of await readdir(path.join(CACHE_DIR, dir)).catch(() => [] as string[])) {
      if (name.endsWith(".type")) continue;
      const file = path.join(CACHE_DIR, dir, name);
      const st = await stat(file).catch(() => null);
      if (st) out.push({ file, size: st.size, used: st.atimeMs });
    }
  }
  return out;
}

const cacheSize = async () => (await cacheFiles()).reduce((n, f) => n + f.size, 0);

/** Removes the least recently used files until the cache is at 80% of its cap. */
async function trimCache(): Promise<void> {
  const files = (await cacheFiles()).sort((a, b) => a.used - b.used);
  let total = files.reduce((n, f) => n + f.size, 0);
  for (const f of files) {
    if (total <= CACHE_MAX_BYTES * 0.8) break;
    await rm(f.file, { force: true });
    await rm(`${f.file}.type`, { force: true });
    total -= f.size;
  }
  cacheBytes = total;
}

// Outbox for uploads that must not keep a visitor waiting (driver applications): the bytes are
// written to the server's disk at once and uploaded in the background, retried until the bucket
// accepts them, also after a restart (startPendingUploads). Until then they are read from disk.
const PENDING_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.STORAGE_PENDING_DIR || ".data/pending-uploads");
const pendingPath = (key: string) => path.join(PENDING_DIR, createHash("sha256").update(key).digest("hex"));
const flushing = new Set<string>();

/** Saves an object locally now and uploads it in the background (see flushPending). */
export async function queueObject(key: string, body: Uint8Array | Buffer, contentType: string): Promise<void> {
  const file = pendingPath(key);
  await mkdir(PENDING_DIR, { recursive: true });
  await writeFile(`${file}.json`, JSON.stringify({ key, contentType, queuedAt: new Date().toISOString() }));
  await writeFile(file, body);
}

async function readPending(key: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  const file = pendingPath(key);
  try {
    const [bytes, meta] = await Promise.all([readFile(file), readFile(`${file}.json`, "utf8")]);
    return { bytes, contentType: (JSON.parse(meta) as { contentType: string }).contentType };
  } catch {
    return null;
  }
}

/** Uploads queued objects (all of them, or just `keys`). Failures stay queued for the next run. */
export async function flushPending(keys?: string[]): Promise<{ uploaded: number; failed: number }> {
  let entries: { key: string; contentType: string }[] = [];
  if (keys) entries = keys.map((key) => ({ key, contentType: "" }));
  else {
    for (const name of await readdir(PENDING_DIR).catch(() => [] as string[])) {
      if (!name.endsWith(".json")) continue;
      try {
        entries.push(JSON.parse(await readFile(path.join(PENDING_DIR, name), "utf8")));
      } catch {}
    }
  }
  let uploaded = 0;
  let failed = 0;
  await Promise.all(
    entries.map(async ({ key }) => {
      if (flushing.has(key)) return;
      flushing.add(key);
      try {
        const obj = await readPending(key);
        if (!obj) return;
        await putObject(key, obj.bytes, obj.contentType);
        await writeCache(key, obj.bytes, obj.contentType);
        const file = pendingPath(key);
        await Promise.all([rm(file, { force: true }), rm(`${file}.json`, { force: true })]);
        uploaded++;
      } catch (err) {
        failed++;
        console.error(`[storage] upload of ${key} failed, will retry:`, err instanceof Error ? err.message : err);
      } finally {
        flushing.delete(key);
      }
    }),
  );
  return { uploaded, failed };
}

/** Objects still waiting to be uploaded (health check). */
export async function pendingUploads(): Promise<{ count: number; oldestMinutes: number }> {
  let count = 0;
  let oldest = Date.now();
  for (const name of await readdir(PENDING_DIR).catch(() => [] as string[])) {
    if (!name.endsWith(".json")) continue;
    count++;
    const st = await stat(path.join(PENDING_DIR, name)).catch(() => null);
    if (st) oldest = Math.min(oldest, st.mtimeMs);
  }
  return { count, oldestMinutes: count ? Math.round((Date.now() - oldest) / 60_000) : 0 };
}

/** Retries queued uploads at start-up and every minute (called once from src/instrumentation.ts). */
export function startPendingUploads(): void {
  if (!config()) return;
  const run = () => flushPending().catch((err) => console.error("[storage] pending uploads:", err));
  void run();
  setInterval(run, 60_000).unref();
}

export async function getObject(key: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  const local = (await readCache(key)) ?? (await readPending(key));
  if (local) return local;
  // Several requests for the same image at once (e.g. different sizes) share one download.
  let pending = inflight.get(key);
  if (!pending) {
    pending = (async () => {
      const c = need();
      const res = await c.client.fetch(url(c, key), { signal: AbortSignal.timeout(60_000) });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`Storage read failed (${res.status}) for ${key}`);
      const obj = { bytes: Buffer.from(await res.arrayBuffer()), contentType: res.headers.get("content-type") ?? "application/octet-stream" };
      await writeCache(key, obj.bytes, obj.contentType);
      return obj;
    })().finally(() => inflight.delete(key));
    inflight.set(key, pending);
  }
  return pending;
}

export async function deleteObject(key: string): Promise<void> {
  const c = need();
  const file = cachePath(key);
  const pending = pendingPath(key);
  await Promise.all([rm(file, { force: true }), rm(`${file}.type`, { force: true }), rm(pending, { force: true }), rm(`${pending}.json`, { force: true })]);
  const res = await c.client.fetch(url(c, key), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`Storage delete failed (${res.status}) for ${key}`);
}

/** Checks the bucket answers (health check): a one-key listing under the site's prefix. */
export async function pingStorage(): Promise<void> {
  const c = need();
  const res = await c.client.fetch(`${c.base}?list-type=2&max-keys=1&prefix=${encodeURIComponent(c.prefix)}`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Storage check failed (${res.status})`);
}

/** Deletes several objects, ignoring ones that are already gone. */
export async function deleteObjects(keys: (string | null | undefined)[]): Promise<void> {
  await Promise.all(keys.filter((k): k is string => !!k).map((k) => deleteObject(k).catch((e) => console.error("[storage]", e))));
}
