// Fills an empty database and bucket with the website's starting content:
//   1. Website images: each slot in src/lib/site-images.ts gets its starter photo, uploaded to
//      object storage and recorded in site_images (slots that already have an image are skipped).
//   2. Blog: four starter guides as published blog posts with cover photos (only if there are no
//      blog posts yet).
// Safe to run more than once.
//
//   npm run seed:content
import postgres from "postgres";
import { AwsClient } from "aws4fetch";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const unquote = (v) => v.trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
const env = {
  ...Object.fromEntries(
    readFileSync(new URL("../.env.local", import.meta.url), "utf8")
      .split("\n")
      .filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l))
      .map((l) => [l.slice(0, l.indexOf("=")), unquote(l.slice(l.indexOf("=") + 1))]),
  ),
  ...process.env,
};
const sql = postgres(env.DATABASE_URL, { max: 2, onnotice: () => {} });
const s3 = new AwsClient({ accessKeyId: env.OBJECT_STORAGE_ACCESS_KEY, secretAccessKey: env.OBJECT_STORAGE_SECRET_KEY, service: "s3", region: env.OBJECT_STORAGE_REGION || "us-east-1" });
const bucketUrl = `${env.OBJECT_STORAGE_ENDPOINT.replace(/\/$/, "")}/${env.OBJECT_STORAGE_BUCKET}`;
const prefix = (env.OBJECT_STORAGE_BASE_PREFIX ?? "").replace(/^\/|\/$/g, "");
const keyFor = (path) => (prefix ? `${prefix}/${path}` : path);
/** Upload with a timeout and a few retries (uploads to the bucket can occasionally stall). */
async function put(key, bytes, mime) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await s3.fetch(`${bucketUrl}/${key}`, { method: "PUT", body: bytes, headers: { "Content-Type": mime }, signal: AbortSignal.timeout(60_000) });
      if (res.ok) return;
      throw new Error(`status ${res.status}`);
    } catch (err) {
      if (attempt >= 4) throw new Error(`upload failed for ${key}: ${err.message}`);
      console.log(`  retrying upload (${attempt})…`);
    }
  }
}

// Bring the schema up to date first (same SQL the app runs on start-up)
{
  const schemaSrc = readFileSync(new URL("../src/lib/schema.ts", import.meta.url), "utf8");
  const SCHEMA = schemaSrc.slice(schemaSrc.indexOf("`") + 1, schemaSrc.lastIndexOf("`"));
  const VERSION = Number(/SCHEMA_VERSION = (\d+)/.exec(schemaSrc)[1]);
  await sql`CREATE TABLE IF NOT EXISTS schema_meta (id INT PRIMARY KEY, version INT NOT NULL)`;
  await sql.begin(async (tx) => {
    await tx.unsafe(SCHEMA);
    await tx`INSERT INTO schema_meta (id, version) VALUES (1, ${VERSION}) ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version`;
  });
  console.log(`schema ready (version ${VERSION})`);
}

/** Width and height of a JPEG, from its SOF marker. */
function jpegSize(buf) {
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

async function download(seed, width) {
  let res;
  for (let attempt = 1; ; attempt++) {
    try {
      res = await fetch(`https://images.unsplash.com/${seed}?auto=format&fit=crop&w=${width}&q=80&fm=jpg`, { signal: AbortSignal.timeout(60_000) });
      if (res.ok) break;
      throw new Error(`status ${res.status}`);
    } catch (err) {
      if (attempt >= 4) throw new Error(`download failed for ${seed}: ${err.message}`);
      console.log(`  retrying download (${attempt})…`);
    }
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  const size = jpegSize(bytes);
  if (!size) throw new Error(`couldn't read the size of ${seed}`);
  return { bytes, ...size };
}

// Slots and their starter photos, read from src/lib/site-images.ts
const src = readFileSync(new URL("../src/lib/site-images.ts", import.meta.url), "utf8");
const slots = [...src.matchAll(/slot: "([a-z0-9-]+)"[^}]*?alt: "([^"]*)"[^}]*?seed: "([^"]+)"/g)].map(([, slot, alt, seed]) => ({ slot, alt, seed }));

// 1. Website images
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
log("reading existing images…");
const have = new Set((await sql`SELECT slot FROM site_images`).map((r) => r.slot));
log(`${have.size} already stored`);
const downloaded = new Map();
let added = 0;
for (const { slot, alt, seed } of slots) {
  if (have.has(slot)) continue;
  log(`${slot}: downloading`);
  const full = downloaded.get(seed) ?? (await download(seed, 1600));
  downloaded.set(seed, full);
  const thumb = await download(seed, 640);
  const id = randomUUID();
  const fullKey = keyFor(`site/${slot}/${id}.jpg`);
  const thumbKey = keyFor(`site/${slot}/${id}-thumb.jpg`);
  log(`${slot}: uploading ${Math.round(full.bytes.length / 1024)} KB`);
  await put(fullKey, full.bytes, "image/jpeg");
  await put(thumbKey, thumb.bytes, "image/jpeg");
  log(`${slot}: saving record`);
  await sql`
    INSERT INTO site_images (slot, storage_key, thumb_key, mime, width, height, alt)
    VALUES (${slot}, ${fullKey}, ${thumbKey}, 'image/jpeg', ${full.width}, ${full.height}, ${alt})
    ON CONFLICT (slot) DO NOTHING`;
  added++;
  console.log(`image  ${slot}`);
}
console.log(`website images: ${added} added, ${have.size} already there (${slots.length} slots)`);

// 2. Blog starter guides
const CITY = "Butwal";
const AREA = "Butwal – Bhairahawa";
const COMPANY = "Praja Ride Pvt. Ltd.";
const GUIDES = [
  {
    slug: "how-to-book-your-first-nepcab-ride",
    topic: "Guides",
    cover: "photo-1773063449875-332dff62b6e3",
    title: `How to book your first NepCab ride in ${CITY}`,
    excerpt: "From downloading the app to meeting your driver: a quick guide for first-time riders.",
    body: `NepCab is the ride-hailing app ${COMPANY} runs in ${AREA}. Booking takes a minute once the app is on your phone.

## Before your first ride
- Download NepCab free from Google Play or the App Store.
- Sign up with your mobile number.
- Allow location access so the app can find your pickup point.

## Booking a ride
- Set your pickup point and where you are going.
- Choose a ride type: an everyday ride, Pool to share with others heading your way, Intercity for trips between cities, or Bidding to offer your own fare.
- Confirm, and the app shows your driver and vehicle as they head to you.

## When your driver arrives
Check that the vehicle number matches the one in the app before you get in. If anything doesn't look right, don't start the trip and call our office.

## Prefer to talk to someone?
You can also book by phone, WhatsApp or at our office in Tilottama-5, ${CITY}. Our booking desk will arrange the ride for you.`,
  },
  {
    slug: "book-without-a-smartphone",
    topic: "Guides",
    cover: "photo-1626863905121-3b0c0ed7b94c",
    title: "No smartphone? How to book any Praja Ride service offline",
    excerpt: "Call, WhatsApp or walk in: our booking desk arranges rides, rentals, charging and trial practice for you.",
    body: `Not everyone wants to use an app, and you don't have to. Every Praja Ride service can be booked through our team.

## Three ways to book
- Call us and tell us what you need, where and when.
- Send a WhatsApp message with your pickup, drop-off and time.
- Walk in at our office in Tilottama-5, ${CITY}.

## What you can book
- Rides, booked on the NepCab app on your behalf.
- Vehicle rental, by the hour, day or trip.
- A charging slot at the Praja Ride station.
- Practice time at the driving trial center.

## What to have ready
Your name and phone number, the pickup point, the time, and anything the driver should know. For rentals and trial practice, our team will tell you which documents to bring.`,
  },
  {
    slug: "ride-safely-checklist",
    topic: "Safety",
    cover: "photo-1546554673-384fa6394fbf",
    title: "Riding safely: a short checklist for every trip",
    excerpt: "A few simple habits that keep every ride safe, whether it's a quick trip in town or a longer journey.",
    body: `Most rides are uneventful, and a few simple habits help keep it that way.

## Before you get in
- Match the vehicle number and the driver's name with the details in the app.
- Sit in the back seat when you are riding alone in a car.
- On a bike, always wear the helmet.

## During the ride
- Share your trip details with a friend or family member.
- Keep your phone charged and with you.
- If you feel uncomfortable, ask the driver to stop in a busy, well-lit place.

## In an emergency
Call the police on 100 or an ambulance on 102 first. Then tell our office, so we can help and follow up with the driver partner.

## Left something behind?
Contact our office as soon as possible with the date, time and route of your ride. We will reach out to the driver.`,
  },
  {
    slug: "what-you-need-to-drive-with-nepcab",
    topic: "Drivers",
    cover: "photo-1527593167147-e9c94a5883e6",
    title: "Thinking of driving with NepCab? Here is what you need",
    excerpt: "The documents, the steps and what happens after you apply to become a driver partner.",
    body: `Driver partners in ${AREA} join through the ${COMPANY} office, so you always have a local team to call.

## Documents
- A valid driving license for your vehicle's category.
- Your vehicle's bluebook (registration) and valid insurance.
- Nepali citizenship, aged 18 or above.
- An Android phone or iPhone with mobile data.

## How it works
- Apply online on our Drive with us page, with a few photos of your vehicle.
- Our office calls you and checks your license and vehicle papers.
- Once approved, you get your driver ID, a portal login, and your own referral link and QR code.
- Go online in the NepCab app and start driving.

## Referral rewards
Every driver partner gets a personal QR code. New phones that download NepCab through it count toward monthly targets, and rewards are paid by ${COMPANY}.`,
  },
];

const [{ n: blogCount }] = await sql`SELECT count(*)::int AS n FROM posts WHERE kind = 'blog'`;
if (blogCount > 0) {
  console.log(`blog: ${blogCount} posts already there, starter guides not added`);
} else {
  // Oldest first, so the first guide ends up newest
  for (const [i, g] of [...GUIDES].reverse().entries()) {
    const full = downloaded.get(g.cover) ?? (await download(g.cover, 1600));
    const thumb = await download(g.cover, 640);
    const photoId = randomUUID();
    const fullKey = keyFor(`photos/${photoId}/full.jpg`);
    const thumbKey = keyFor(`photos/${photoId}/thumb.jpg`);
    await put(fullKey, full.bytes, "image/jpeg");
    await put(thumbKey, thumb.bytes, "image/jpeg");
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO photos (id, album, caption, mime, storage_key, thumb_key, width, height, sort)
        VALUES (${photoId}, 'news', '', 'image/jpeg', ${fullKey}, ${thumbKey}, ${full.width}, ${full.height}, 0)`;
      await tx`
        INSERT INTO posts (slug, kind, title, excerpt, body, cover_id, published, published_at, topic)
        VALUES (${g.slug}, 'blog', ${g.title}, ${g.excerpt}, ${g.body}, ${photoId}, true, now() - ${`${i} minutes`}::interval, ${g.topic})
        ON CONFLICT (slug) DO NOTHING`;
    });
    console.log(`blog   ${g.slug}`);
  }
}

await sql.end();
