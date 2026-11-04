// Fills the server's image cache after a deploy, so no visitor waits for object storage on the
// first view of an image. Requests every website image and photo (large and thumbnail) from the
// running site, four at a time.
//
//   node --env-file=.env.production scripts/warm-cache.mjs [http://127.0.0.1:3000]
import postgres from "postgres";

const base = (process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const url = new URL(process.env.DATABASE_URL);
url.searchParams.delete("channel_binding");
const sql = postgres(url.toString(), { max: 1, onnotice: () => {} });

const slots = await sql`SELECT slot FROM site_images`;
const photos = await sql`SELECT id FROM photos`;
await sql.end();

const paths = [
  ...slots.flatMap(({ slot }) => [`/media/site/${slot}`, `/media/site/${slot}?s=thumb`]),
  ...photos.flatMap(({ id }) => [`/media/${id}`, `/media/${id}?s=thumb`]),
];
let done = 0;
let failed = 0;
const started = Date.now();
async function worker() {
  while (paths.length) {
    const p = paths.shift();
    try {
      const res = await fetch(base + p, { signal: AbortSignal.timeout(120_000) });
      await res.arrayBuffer();
      if (!res.ok) throw new Error(String(res.status));
      done++;
    } catch (err) {
      failed++;
      console.log(`  ${p}: ${err.message}`);
    }
  }
}
const total = paths.length;
await Promise.all([worker(), worker(), worker(), worker()]);
console.log(`warmed ${done}/${total} images in ${Math.round((Date.now() - started) / 1000)}s${failed ? `, ${failed} failed` : ""}`);
