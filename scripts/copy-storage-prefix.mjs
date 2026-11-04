// Copies every object under one base prefix of the Contabo bucket to another, so the MySQL site
// gets its own copy of the images instead of sharing the Postgres site's files.
//
//   node scripts/copy-storage-prefix.mjs --dry-run      # list what would be copied
//   node scripts/copy-storage-prefix.mjs                # do it
//   node scripts/copy-storage-prefix.mjs --force        # re-copy keys that already exist
//
// Source prefix defaults to nepcab-shared-assets and the destination to the current
// OBJECT_STORAGE_BASE_PREFIX in .env; override with --from / --to. Everything else (endpoint,
// bucket, region, keys) comes from .env, read the same way src/lib/storage.ts reads it.
//
// The copy is server-side: each object is a PUT carrying x-amz-copy-source, so Contabo duplicates
// the bytes inside the bucket and nothing is downloaded here. If the bucket ever refuses that
// (some S3 implementations do for large objects), the object falls back to a GET + PUT through
// this machine so the run still completes.

import { readFileSync } from "node:fs";
import { AwsClient } from "aws4fetch";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const value = (n, d = null) => {
  const i = argv.indexOf(`--${n}`);
  return i === -1 || i === argv.length - 1 ? d : argv[i + 1];
};

function loadEnv(file) {
  const out = {};
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return out;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].trim().replace(/^(['"])([\s\S]*)\1$/, "$2");
  }
  return out;
}

const env = { ...loadEnv(value("env-file", ".env")), ...process.env };
const trim = (p) => (p ?? "").replace(/^\/|\/$/g, "");

const OPT = {
  from: trim(value("from", "nepcab-shared-assets")),
  to: trim(value("to", env.OBJECT_STORAGE_BASE_PREFIX)),
  dryRun: flag("dry-run"),
  force: flag("force"),
  concurrency: Number(value("concurrency", 8)),
};

const endpoint = (env.OBJECT_STORAGE_ENDPOINT ?? "").replace(/\/$/, "");
const bucket = env.OBJECT_STORAGE_BUCKET;
for (const [k, v] of Object.entries({
  OBJECT_STORAGE_ENDPOINT: endpoint,
  OBJECT_STORAGE_BUCKET: bucket,
  OBJECT_STORAGE_ACCESS_KEY: env.OBJECT_STORAGE_ACCESS_KEY,
  OBJECT_STORAGE_SECRET_KEY: env.OBJECT_STORAGE_SECRET_KEY,
})) {
  if (!v) throw new Error(`${k} is not set.`);
}
if (!OPT.to) throw new Error("No destination prefix: set OBJECT_STORAGE_BASE_PREFIX or pass --to.");
if (OPT.from === OPT.to) throw new Error(`Source and destination prefix are both "${OPT.from}".`);

const client = new AwsClient({
  accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY,
  secretAccessKey: env.OBJECT_STORAGE_SECRET_KEY,
  service: "s3",
  region: env.OBJECT_STORAGE_REGION || "us-east-1",
});
const base = `${endpoint}/${bucket}`;

// Each path segment is encoded on its own: a key may contain "/" but also spaces and "+".
const encodeKey = (key) => key.split("/").map(encodeURIComponent).join("/");

async function listAll(prefix) {
  const out = [];
  let token = null;
  do {
    const url =
      `${base}?list-type=2&max-keys=1000&prefix=${encodeURIComponent(prefix + "/")}` +
      (token ? `&continuation-token=${encodeURIComponent(token)}` : "");
    const res = await client.fetch(url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`list ${prefix} -> ${res.status} ${await res.text()}`);
    const xml = await res.text();
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const key = /<Key>([\s\S]*?)<\/Key>/.exec(m[1])?.[1];
      const size = Number(/<Size>(\d+)<\/Size>/.exec(m[1])?.[1] ?? 0);
      if (key) out.push({ key: decodeEntities(key), size });
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(xml)?.[1] ?? null
      : null;
  } while (token);
  return out;
}

const decodeEntities = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

async function copyOne(srcKey, dstKey) {
  const res = await client.fetch(`${base}/${encodeKey(dstKey)}`, {
    method: "PUT",
    headers: { "x-amz-copy-source": `/${bucket}/${encodeKey(srcKey)}` },
    signal: AbortSignal.timeout(120_000),
  });
  const body = res.ok ? await res.text() : await res.text();
  // Ceph/S3 answer 200 with a CopyObjectResult body; an error can also arrive inside a 200.
  if (!res.ok || /<Error>/.test(body)) {
    const reason = `${res.status} ${(/<Message>([\s\S]*?)<\/Message>/.exec(body)?.[1] ?? body).slice(0, 160)}`;
    return { ok: false, reason };
  }
  return { ok: true };
}

// Used only when the bucket refuses a server-side copy for a given object.
async function copyThrough(srcKey, dstKey) {
  const get = await client.fetch(`${base}/${encodeKey(srcKey)}`, { signal: AbortSignal.timeout(120_000) });
  if (!get.ok) return { ok: false, reason: `get ${get.status}` };
  const bytes = Buffer.from(await get.arrayBuffer());
  const put = await client.fetch(`${base}/${encodeKey(dstKey)}`, {
    method: "PUT",
    body: bytes,
    headers: { "content-type": get.headers.get("content-type") || "application/octet-stream" },
    signal: AbortSignal.timeout(120_000),
  });
  return put.ok ? { ok: true, through: true } : { ok: false, reason: `put ${put.status}` };
}

// --------------------------------------------------------------------------------- run

console.log(`bucket  ${bucket} @ ${endpoint}`);
console.log(`copy    ${OPT.from}/  ->  ${OPT.to}/\n`);

const source = await listAll(OPT.from);
if (!source.length) {
  console.log(`Nothing found under "${OPT.from}/". Check --from.`);
  process.exit(0);
}
const existing = new Map((await listAll(OPT.to)).map((o) => [o.key, o.size]));

const totalBytes = source.reduce((n, o) => n + o.size, 0);
console.log(
  `source  ${source.length} objects, ${(totalBytes / 1024 / 1024).toFixed(1)} MB` +
    `\ntarget  ${existing.size} objects already under "${OPT.to}/"\n`,
);

const work = [];
let skipped = 0;
for (const o of source) {
  const dstKey = `${OPT.to}/${o.key.slice(OPT.from.length + 1)}`;
  if (!OPT.force && existing.get(dstKey) === o.size) {
    skipped++;
    continue;
  }
  work.push({ srcKey: o.key, dstKey, size: o.size });
}

console.log(`plan    ${work.length} to copy, ${skipped} already there (same size)`);
if (OPT.dryRun) {
  for (const w of work.slice(0, 40)) console.log(`  would copy ${w.srcKey}  ->  ${w.dstKey}`);
  if (work.length > 40) console.log(`  ... and ${work.length - 40} more`);
  process.exit(0);
}
if (!work.length) {
  console.log("\nNothing to do.");
  process.exit(0);
}

let done = 0;
let through = 0;
const failures = [];
const queue = work.slice();
await Promise.all(
  Array.from({ length: Math.min(OPT.concurrency, queue.length) }, async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      let r = await copyOne(item.srcKey, item.dstKey);
      if (!r.ok) {
        const fallback = await copyThrough(item.srcKey, item.dstKey);
        if (fallback.ok) {
          through++;
          r = fallback;
        } else failures.push({ ...item, reason: `${r.reason}; fallback: ${fallback.reason}` });
      }
      done++;
      process.stdout.write(`\rcopied ${done}/${work.length}`.padEnd(40));
    }
  }),
);
process.stdout.write("\r".padEnd(40) + "\r");

// Verify by listing the destination again rather than trusting the responses.
const after = await listAll(OPT.to);
const afterMap = new Map(after.map((o) => [o.key, o.size]));
const missing = [];
let bytesOk = 0;
for (const o of source) {
  const dstKey = `${OPT.to}/${o.key.slice(OPT.from.length + 1)}`;
  if (afterMap.get(dstKey) === o.size) bytesOk += o.size;
  else missing.push({ dstKey, want: o.size, got: afterMap.get(dstKey) ?? "absent" });
}

console.log(`\n--- result ---`);
console.log(`copied        ${done - failures.length}${through ? ` (${through} via download+upload)` : ""}`);
console.log(`skipped       ${skipped}`);
console.log(`destination   ${after.length} objects under "${OPT.to}/"`);
console.log(`verified      ${source.length - missing.length}/${source.length} objects match source size` +
  ` (${(bytesOk / 1024 / 1024).toFixed(1)} of ${(totalBytes / 1024 / 1024).toFixed(1)} MB)`);

for (const f of failures.slice(0, 15)) console.error(`FAILED  ${f.srcKey}: ${f.reason}`);
for (const m of missing.slice(0, 15)) console.error(`MISSING ${m.dstKey} (want ${m.want} bytes, got ${m.got})`);
if (failures.length || missing.length) {
  console.error(`\n${failures.length} failed, ${missing.length} not verified. Re-run to retry just those.`);
  process.exitCode = 1;
} else console.log("\nEvery source object exists at the destination with the same size.");
