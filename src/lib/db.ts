import "server-only";
import postgres from "postgres";
import { generateRefCode } from "./refcode";
import { SCHEMA, SCHEMA_VERSION } from "./schema";
import type { Platform } from "./tracking";

const CONNECTION_STRING_HELP =
  "DATABASE_URL is not a valid connection string. It has to read" +
  " postgres://user:password@host:5432/dbname?sslmode=require, with no surrounding quotes and with" +
  " special characters in the password URL-encoded (@ as %40, # as %23).";

// Hosting panels and the ".env" importers that feed them often keep the quotes around a pasted
// value, and a quoted string is not a URL. The quotes are stripped here because the alternative is
// a bare "Invalid URL" thrown from whichever page happened to need the database first - a long way
// from the setting that actually caused it, and reported as a broken image rather than a bad value.
const unquote = (value: string) =>
  value
    .trim()
    .replace(/^(['"])([\s\S]*)\1$/, "$2")
    .trim();

function connectionString(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw?.trim()) throw new Error("DATABASE_URL is not set. See README → Deploy.");
  let url: URL;
  try {
    url = new URL(unquote(raw));
  } catch {
    throw new Error(CONNECTION_STRING_HELP);
  }
  // Some hosts add channel_binding=require; postgres.js would forward it as a server
  // setting and the connection would be rejected.
  url.searchParams.delete("channel_binding");
  return url.toString();
}

/**
 * What is wrong with DATABASE_URL, or null when it can be used. Lets the start-up check name a
 * malformed connection string at boot, instead of leaving every page to discover it one by one.
 * An unset variable is reported separately, so it is not a problem here.
 */
export function connectionStringProblem(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.DATABASE_URL;
  if (!raw?.trim()) return null;
  try {
    new URL(unquote(raw));
    return null;
  } catch {
    return CONNECTION_STRING_HELP;
  }
}

// A database that answers "no" is survivable: every page falls back to its starting content. A
// database that answers *nothing* is not, so the wait has to be bounded. A host that drops packets
// instead of refusing them (a firewall DROP, or a server that is simply gone) would otherwise stall
// on the operating system's TCP timeout of around two minutes, and nginx returns 504 Gateway
// Time-out before the page has sent anything.
const CONNECT_TIMEOUT = Number(process.env.DATABASE_CONNECT_TIMEOUT || 8);

// How long a failed schema check is remembered (below).
const RETRY_AFTER_MS = Number(process.env.DATABASE_RETRY_AFTER_MS || 30_000);

const globalForDb = globalThis as unknown as {
  sql?: postgres.Sql;
  schemaReady?: Promise<void>;
  schemaFailed?: { at: number; error: unknown };
};

function db(): postgres.Sql {
  // prepare: false keeps it compatible with transaction poolers (Supabase, PgBouncer).
  globalForDb.sql ??= postgres(connectionString(), {
    max: 5,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: CONNECT_TIMEOUT,
    onnotice: () => {}, // silence "already exists, skipping"
  });
  return globalForDb.sql;
}

/**
 * Brings the database up to SCHEMA_VERSION. Runs the (idempotent) schema only when the stored
 * version is older, so normal cold starts do one cheap read instead of ALTER TABLE statements,
 * which take table locks. An advisory lock stops two instances migrating at the same time.
 */
async function migrate(client: postgres.Sql): Promise<void> {
  await client`CREATE TABLE IF NOT EXISTS schema_meta (id INT PRIMARY KEY, version INT NOT NULL)`;
  const [row] = await client`SELECT version FROM schema_meta WHERE id = 1`;
  if (row && row.version >= SCHEMA_VERSION) return;
  await client.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(472910)`;
    const [again] = await tx`SELECT version FROM schema_meta WHERE id = 1`;
    if (again && again.version >= SCHEMA_VERSION) return;
    await tx.unsafe(SCHEMA);
    await tx`INSERT INTO schema_meta (id, version) VALUES (1, ${SCHEMA_VERSION}) ON CONFLICT (id) DO UPDATE SET version = EXCLUDED.version`;
  });
  await backfillRefCodes(client);
}

/**
 * The client, with the schema brought up to date once per server start.
 *
 * A failed schema check is retried by the next caller, so an unreachable database must not cost
 * every helper on the page a connect timeout of its own: rendering one page asks for the client a
 * dozen times over (layout, content blocks, services, photos, posts), and those waits add up past
 * nginx's limit. The failure is remembered for RETRY_AFTER_MS and re-thrown at once, which lets
 * each helper fall back to its starting content in milliseconds instead.
 */
export async function sql(): Promise<postgres.Sql> {
  const client = db();
  const failed = globalForDb.schemaFailed;
  if (failed && Date.now() - failed.at < RETRY_AFTER_MS) throw failed.error;
  globalForDb.schemaReady ??= migrate(client).then(
    () => {
      globalForDb.schemaFailed = undefined;
    },
    (err) => {
      globalForDb.schemaReady = undefined;
      globalForDb.schemaFailed = { at: Date.now(), error: err };
      throw err;
    },
  );
  await globalForDb.schemaReady;
  return client;
}

/**
 * One `SELECT 1`, with no schema work and ignoring the remembered failure above, so an uptime or
 * diagnostic check always reports what the database answers right now (see /api/health).
 */
export async function pingDatabase(): Promise<void> {
  const client = db();
  await client`SELECT 1`;
}

/** Gives every driver created before referral codes existed a code of their own. */
async function backfillRefCodes(client: postgres.Sql): Promise<void> {
  const rows = await client`SELECT id FROM drivers WHERE ref_code IS NULL`;
  for (const { id } of rows) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await client`UPDATE drivers SET ref_code = ${generateRefCode()} WHERE id = ${id} AND ref_code IS NULL`;
        break;
      } catch (err) {
        if ((err as { code?: string }).code !== "23505") throw err; // retry only on a (very unlikely) clash
      }
    }
  }
}

export type ClickEvent = {
  id?: string;
  driverId: string;
  eventType: "scan" | "store_click";
  platform: Platform;
  store?: "play" | "appstore" | null;
  visitId?: string | null;
  deviceId?: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  referrer: string | null;
};

export async function logClick(e: ClickEvent): Promise<void> {
  const q = await sql();
  await q`
    INSERT INTO referral_clicks
      (id, driver_id, event_type, platform, store, visit_id, device_id, ip_address, user_agent, referrer)
    VALUES
      (${e.id ?? crypto.randomUUID()}, ${e.driverId}, ${e.eventType}, ${e.platform}, ${e.store ?? null},
       ${e.visitId ?? null}, ${e.deviceId ?? null}, ${e.ipAddress}, ${e.userAgent}, ${e.referrer})`;
}

/**
 * Every number on the dashboards counts UNIQUE PHONES, never raw taps: opening a link ten times
 * from one phone counts once. A phone is the nc_dev cookie, or IP + user agent when it's missing.
 * Phones a driver has logged into the portal from are left out entirely (no self-inflation).
 * Raw events are still stored in referral_clicks; this is only how they're counted.
 *
 * "Downloads" are unique phones that tapped a store button. The site can't see the install
 * itself, which happens inside Google Play / the App Store.
 */
function counted(q: postgres.Sql) {
  return q.unsafe(`(
    SELECT r.*, COALESCE(r.device_id::text, 'ip:' || COALESCE(r.ip_address, '') || '|' || md5(COALESCE(r.user_agent, ''))) AS dkey
    FROM referral_clicks r
    WHERE NOT EXISTS (SELECT 1 FROM driver_devices dd WHERE dd.device_id = r.device_id)
  )`);
}

/** count(DISTINCT phone) for events matching a fixed SQL condition (static strings only). */
const phones = (q: postgres.Sql, where: string) => q.unsafe(`count(DISTINCT e.dkey) FILTER (WHERE ${where})::int`);
const SCAN = "e.event_type = 'scan'";
const PLAY = "e.event_type = 'store_click' AND e.store = 'play'";
const APPSTORE = "e.event_type = 'store_click' AND e.store = 'appstore'";
const TAP = "e.event_type = 'store_click'";

const monthRange = (q: postgres.Sql, period: string) =>
  q`e.created_at >= ((${period} || '-01')::timestamp AT TIME ZONE 'Asia/Kathmandu')
    AND e.created_at < ((${period} || '-01')::timestamp AT TIME ZONE 'Asia/Kathmandu') + interval '1 month'`;

export type Downloads = { androidDownloads: number; iosDownloads: number };

export type Totals = Downloads & {
  /** Unique phones that opened a link / scanned a QR. */
  scans: number;
  android: number;
  ios: number;
  desktop: number;
  drivers: number;
  scansToday: number;
};

export type DriverRow = Downloads & {
  driverId: string;
  name: string | null;
  phone: string | null;
  refCode: string | null;
  registered: boolean;
  active: boolean;
  scans: number;
  android: number;
  ios: number;
  desktop: number;
  lastActive: Date;
};

export type DailyRow = { day: string; scans: number };

export async function getTotals(): Promise<Totals> {
  const q = await sql();
  const [row] = await q`
    SELECT
      ${phones(q, SCAN)}                                   AS scans,
      ${phones(q, `${SCAN} AND e.platform = 'android'`)}   AS android,
      ${phones(q, `${SCAN} AND e.platform = 'ios'`)}       AS ios,
      ${phones(q, `${SCAN} AND e.platform = 'desktop'`)}   AS desktop,
      ${phones(q, PLAY)}                                   AS "androidDownloads",
      ${phones(q, APPSTORE)}                               AS "iosDownloads",
      count(DISTINCT e.driver_id)::int                     AS drivers,
      ${phones(q, `${SCAN} AND e.created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Kathmandu') AT TIME ZONE 'Asia/Kathmandu'`)} AS "scansToday"
    FROM ${counted(q)} e`;
  return row as unknown as Totals;
}

export async function getLeaderboard(limit = 200): Promise<DriverRow[]> {
  const q = await sql();
  const rows = await q`
    SELECT
      e.driver_id                                          AS "driverId",
      d.name,
      d.phone,
      d.ref_code                                           AS "refCode",
      d.id IS NOT NULL                                     AS registered,
      COALESCE(d.active, false)                            AS active,
      ${phones(q, SCAN)}                                   AS scans,
      ${phones(q, `${SCAN} AND e.platform = 'android'`)}   AS android,
      ${phones(q, `${SCAN} AND e.platform = 'ios'`)}       AS ios,
      ${phones(q, `${SCAN} AND e.platform = 'desktop'`)}   AS desktop,
      ${phones(q, PLAY)}                                   AS "androidDownloads",
      ${phones(q, APPSTORE)}                               AS "iosDownloads",
      max(e.created_at)                                    AS "lastActive"
    FROM ${counted(q)} e
    LEFT JOIN drivers d ON d.id = e.driver_id
    GROUP BY e.driver_id, d.id
    ORDER BY scans DESC, "lastActive" DESC
    LIMIT ${limit}`;
  return rows as unknown as DriverRow[];
}

/** Unique phones that scanned, per day for the last `days` days (Nepal time), zero-filled. */
export async function getDaily(days = 14): Promise<DailyRow[]> {
  const q = await sql();
  const rows = await q`
    WITH series AS (
      SELECT generate_series(
        (now() AT TIME ZONE 'Asia/Kathmandu')::date - ${days - 1}::int,
        (now() AT TIME ZONE 'Asia/Kathmandu')::date,
        interval '1 day')::date AS day
    )
    SELECT to_char(s.day, 'YYYY-MM-DD') AS day, count(DISTINCT e.dkey)::int AS scans
    FROM series s
    LEFT JOIN ${counted(q)} e
      ON e.event_type = 'scan' AND (e.created_at AT TIME ZONE 'Asia/Kathmandu')::date = s.day
    GROUP BY s.day
    ORDER BY s.day`;
  return rows as unknown as DailyRow[];
}

export type Activity = { scans: number; storeTaps: number } & Downloads;

/** Unique phones on one driver's link in a month. */
export async function getDriverMonthActivity(driverId: string, period: string): Promise<Activity> {
  const q = await sql();
  const [row] = await q`
    SELECT ${phones(q, SCAN)} AS scans, ${phones(q, TAP)} AS "storeTaps",
           ${phones(q, PLAY)} AS "androidDownloads", ${phones(q, APPSTORE)} AS "iosDownloads"
    FROM ${counted(q)} e
    WHERE e.driver_id = ${driverId} AND ${monthRange(q, period)}`;
  return row as unknown as Activity;
}

export type WeekComparison = { scans: number; scansPrev: number; taps: number; tapsPrev: number };

/** Last 7 days vs the 7 days before (unique phones), for the trend badges. */
export async function getWeekComparison(): Promise<WeekComparison> {
  const q = await sql();
  const recent = "e.created_at >= now() - interval '7 days'";
  const earlier = "e.created_at < now() - interval '7 days'";
  const [row] = await q`
    SELECT
      ${phones(q, `${SCAN} AND ${recent}`)}  AS scans,
      ${phones(q, `${SCAN} AND ${earlier}`)} AS "scansPrev",
      ${phones(q, `${TAP} AND ${recent}`)}   AS taps,
      ${phones(q, `${TAP} AND ${earlier}`)}  AS "tapsPrev"
    FROM ${counted(q)} e
    WHERE e.created_at >= now() - interval '14 days'`;
  return row as unknown as WeekComparison;
}

/** Unique phones across all drivers for a month (Nepal time). */
export async function getMonthActivity(period: string): Promise<Activity> {
  const q = await sql();
  const [row] = await q`
    SELECT ${phones(q, SCAN)} AS scans, ${phones(q, TAP)} AS "storeTaps",
           ${phones(q, PLAY)} AS "androidDownloads", ${phones(q, APPSTORE)} AS "iosDownloads"
    FROM ${counted(q)} e
    WHERE ${monthRange(q, period)}`;
  return row as unknown as Activity;
}

export type ActivityRow = {
  id: string;
  driverId: string;
  driverName: string | null;
  eventType: "scan" | "store_click";
  platform: Platform;
  store: "play" | "appstore" | null;
  createdAt: Date;
};

export async function getRecentActivity(limit = 8): Promise<ActivityRow[]> {
  const q = await sql();
  const rows = await q`
    SELECT c.id, c.driver_id AS "driverId", d.name AS "driverName", c.event_type AS "eventType",
           c.platform, c.store, c.created_at AS "createdAt"
    FROM referral_clicks c
    LEFT JOIN drivers d ON d.id = c.driver_id
    ORDER BY c.created_at DESC
    LIMIT ${limit}`;
  return rows as unknown as ActivityRow[];
}

/** Android / iPhone downloads (unique phones) per driver for a month (or all time with `null`). */
export async function getDownloadsByDriver(period: string | null): Promise<Map<string, Downloads>> {
  const q = await sql();
  const rows = await q`
    SELECT e.driver_id, ${phones(q, PLAY)} AS "androidDownloads", ${phones(q, APPSTORE)} AS "iosDownloads"
    FROM ${counted(q)} e
    WHERE e.event_type = 'store_click' ${period ? q`AND ${monthRange(q, period)}` : q``}
    GROUP BY e.driver_id`;
  return new Map(rows.map((r) => [r.driver_id as string, { androidDownloads: r.androidDownloads, iosDownloads: r.iosDownloads }]));
}
