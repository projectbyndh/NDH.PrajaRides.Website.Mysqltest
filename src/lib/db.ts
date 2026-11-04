import "server-only";
import { generateRefCode } from "./refcode";
import { SCHEMA_VERSION, STARTING_TIERS, schemaStatements } from "./schema";
import {
  bool,
  client,
  connectionProblem,
  duplicateKeyIs,
  inNepal,
  nepalToday,
  type Sql,
} from "./mysql";
import type { Platform } from "./tracking";

export { connectionProblem } from "./mysql";

/** Kept under its old name so the start-up check reads the same (see lib/env-check.ts). */
export const connectionStringProblem = connectionProblem;

// How long a failed schema check is remembered (below).
const RETRY_AFTER_MS = Number(process.env.DATABASE_RETRY_AFTER_MS || 30_000);

const globalForDb = globalThis as unknown as {
  schemaReady?: Promise<void>;
  schemaFailed?: { at: number; error: unknown };
};

/**
 * Brings the database up to SCHEMA_VERSION. Runs the (idempotent) schema only when the stored
 * version is older, so normal cold starts do one cheap read instead of DDL, which on MySQL is not
 * transactional and takes metadata locks. GET_LOCK stops two instances migrating at the same time
 * — MySQL has no transactional DDL, so an advisory lock is the only guard available.
 */
async function migrate(q: Sql): Promise<void> {
  await q`CREATE TABLE IF NOT EXISTS \`schema_meta\` (\`id\` INT NOT NULL, \`version\` INT NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`;
  const [row] = await q`SELECT version FROM \`schema_meta\` WHERE id = 1`;
  if (row && Number(row.version) >= SCHEMA_VERSION) return;

  const [lock] = await q`SELECT GET_LOCK('praja_schema', 10) AS got`;
  if (!Number(lock?.got)) throw new Error("Another instance is migrating the database; try again shortly.");
  try {
    const [again] = await q`SELECT version FROM \`schema_meta\` WHERE id = 1`;
    if (again && Number(again.version) >= SCHEMA_VERSION) return;
    for (const statement of schemaStatements()) await q.unsafe(statement);
    await q`
      INSERT INTO \`schema_meta\` (id, version) VALUES (1, ${SCHEMA_VERSION})
      ON DUPLICATE KEY UPDATE version = VALUES(version)`;
    await seedTiers(q);
  } finally {
    await q`SELECT RELEASE_LOCK('praja_schema')`;
  }
  await backfillRefCodes(q);
}

/** Starting reward tiers, only on a database that has none (see schema.ts). */
async function seedTiers(q: Sql): Promise<void> {
  const [{ n }] = await q`SELECT count(*) AS n FROM reward_tiers`;
  if (Number(n) > 0) return;
  for (const t of STARTING_TIERS) await q`INSERT INTO reward_tiers ${q({ ...t })}`;
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
export async function sql(): Promise<Sql> {
  const q = client();
  const failed = globalForDb.schemaFailed;
  if (failed && Date.now() - failed.at < RETRY_AFTER_MS) throw failed.error;
  globalForDb.schemaReady ??= migrate(q).then(
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
  return q;
}

/**
 * One `SELECT 1`, with no schema work and ignoring the remembered failure above, so an uptime or
 * diagnostic check always reports what the database answers right now (see /api/health).
 */
export async function pingDatabase(): Promise<void> {
  await client()`SELECT 1`;
}

/** Gives every driver created before referral codes existed a code of their own. */
async function backfillRefCodes(q: Sql): Promise<void> {
  const rows = await q`SELECT id FROM drivers WHERE ref_code IS NULL`;
  for (const { id } of rows) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await q`UPDATE drivers SET ref_code = ${generateRefCode()} WHERE id = ${id} AND ref_code IS NULL`;
        break;
      } catch (err) {
        if (!duplicateKeyIs(err, "ref_code")) throw err; // retry only on a (very unlikely) clash
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
      (\`id\`, \`driver_id\`, \`event_type\`, \`platform\`, \`store\`, \`visit_id\`, \`device_id\`, \`ip_address\`, \`user_agent\`, \`referrer\`)
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
const COUNTED = `(
  SELECT r.*, COALESCE(r.device_id, CONCAT('ip:', COALESCE(r.ip_address, ''), '|', MD5(COALESCE(r.user_agent, '')))) AS dkey
  FROM referral_clicks r
  WHERE NOT EXISTS (SELECT 1 FROM driver_devices dd WHERE dd.device_id = r.device_id)
)`;

const counted = (q: Sql) => q.unsafe(COUNTED);

/**
 * count(DISTINCT phone) for events matching a fixed SQL condition (static strings only).
 * Postgres wrote this as `count(...) FILTER (WHERE cond)`; MySQL has no FILTER, so the condition
 * moves inside the aggregate — CASE yields NULL when it does not match, and COUNT skips NULLs.
 */
const phones = (q: Sql, where: string) => q.unsafe(`COUNT(DISTINCT CASE WHEN ${where} THEN e.dkey END)`);

const SCAN = "e.event_type = 'scan'";
const PLAY = "e.event_type = 'store_click' AND e.store = 'play'";
const APPSTORE = "e.event_type = 'store_click' AND e.store = 'appstore'";
const TAP = "e.event_type = 'store_click'";

/** A 'YYYY-MM' period as the UTC instants its Nepal-local month starts and ends at. */
const monthRange = (q: Sql, period: string) =>
  q`e.created_at >= CONVERT_TZ(CONCAT(${period}, '-01 00:00:00'), '+05:45', '+00:00')
    AND e.created_at <  CONVERT_TZ(CONCAT(${period}, '-01 00:00:00'), '+05:45', '+00:00') + INTERVAL 1 MONTH`;

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

const num = (v: unknown): number => Number(v ?? 0);

export async function getTotals(): Promise<Totals> {
  const q = await sql();
  const [row] = await q`
    SELECT
      ${phones(q, SCAN)}                                   AS scans,
      ${phones(q, `${SCAN} AND e.platform = 'android'`)}   AS android,
      ${phones(q, `${SCAN} AND e.platform = 'ios'`)}       AS ios,
      ${phones(q, `${SCAN} AND e.platform = 'desktop'`)}   AS desktop,
      ${phones(q, PLAY)}                                   AS androidDownloads,
      ${phones(q, APPSTORE)}                               AS iosDownloads,
      COUNT(DISTINCT e.driver_id)                          AS drivers,
      ${phones(q, `${SCAN} AND e.created_at >= CONVERT_TZ(${nepalToday()}, '+05:45', '+00:00')`)} AS scansToday
    FROM ${counted(q)} e`;
  return {
    scans: num(row?.scans),
    android: num(row?.android),
    ios: num(row?.ios),
    desktop: num(row?.desktop),
    androidDownloads: num(row?.androidDownloads),
    iosDownloads: num(row?.iosDownloads),
    drivers: num(row?.drivers),
    scansToday: num(row?.scansToday),
  };
}

export async function getLeaderboard(limit = 200): Promise<DriverRow[]> {
  const q = await sql();
  // MAX() over the joined driver columns rather than naming them in GROUP BY: e.driver_id is the
  // group, at most one drivers row joins it, so MAX is that row's value — and it satisfies
  // ONLY_FULL_GROUP_BY on every MySQL version without relying on functional-dependency detection.
  const rows = await q`
    SELECT
      e.driver_id                                          AS driverId,
      MAX(d.name)                                          AS name,
      MAX(d.phone)                                         AS phone,
      MAX(d.ref_code)                                      AS refCode,
      MAX(d.id) IS NOT NULL                                AS registered,
      COALESCE(MAX(d.active), 0)                           AS active,
      ${phones(q, SCAN)}                                   AS scans,
      ${phones(q, `${SCAN} AND e.platform = 'android'`)}   AS android,
      ${phones(q, `${SCAN} AND e.platform = 'ios'`)}       AS ios,
      ${phones(q, `${SCAN} AND e.platform = 'desktop'`)}   AS desktop,
      ${phones(q, PLAY)}                                   AS androidDownloads,
      ${phones(q, APPSTORE)}                               AS iosDownloads,
      MAX(e.created_at)                                    AS lastActive
    FROM ${counted(q)} e
    LEFT JOIN drivers d ON d.id = e.driver_id
    GROUP BY e.driver_id
    ORDER BY scans DESC, lastActive DESC
    LIMIT ${limit}`;
  return rows.map((r) => ({
    driverId: r.driverId as string,
    name: (r.name as string | null) ?? null,
    phone: (r.phone as string | null) ?? null,
    refCode: (r.refCode as string | null) ?? null,
    registered: bool(r.registered),
    active: bool(r.active),
    scans: num(r.scans),
    android: num(r.android),
    ios: num(r.ios),
    desktop: num(r.desktop),
    androidDownloads: num(r.androidDownloads),
    iosDownloads: num(r.iosDownloads),
    lastActive: r.lastActive as Date,
  }));
}

/**
 * Unique phones that scanned, per day for the last `days` days (Nepal time), zero-filled.
 * Postgres filled the days with generate_series; MySQL builds them with a recursive CTE.
 */
export async function getDaily(days = 14): Promise<DailyRow[]> {
  const q = await sql();
  const rows = await q`
    WITH RECURSIVE series AS (
      SELECT DATE_SUB(${q.unsafe(nepalToday())}, INTERVAL ${days - 1} DAY) AS day
      UNION ALL
      SELECT day + INTERVAL 1 DAY FROM series WHERE day < ${q.unsafe(nepalToday())}
    )
    SELECT DATE_FORMAT(s.day, '%Y-%m-%d') AS day, COUNT(DISTINCT e.dkey) AS scans
    FROM series s
    LEFT JOIN ${counted(q)} e
      ON e.event_type = 'scan' AND DATE(${q.unsafe(inNepal("e.created_at"))}) = s.day
    GROUP BY s.day
    ORDER BY s.day`;
  return rows.map((r) => ({ day: r.day as string, scans: num(r.scans) }));
}

export type Activity = { scans: number; storeTaps: number } & Downloads;

const activity = (row: Record<string, unknown> | undefined): Activity => ({
  scans: num(row?.scans),
  storeTaps: num(row?.storeTaps),
  androidDownloads: num(row?.androidDownloads),
  iosDownloads: num(row?.iosDownloads),
});

/** Unique phones on one driver's link in a month. */
export async function getDriverMonthActivity(driverId: string, period: string): Promise<Activity> {
  const q = await sql();
  const [row] = await q`
    SELECT ${phones(q, SCAN)} AS scans, ${phones(q, TAP)} AS storeTaps,
           ${phones(q, PLAY)} AS androidDownloads, ${phones(q, APPSTORE)} AS iosDownloads
    FROM ${counted(q)} e
    WHERE e.driver_id = ${driverId} AND ${monthRange(q, period)}`;
  return activity(row);
}

export type WeekComparison = { scans: number; scansPrev: number; taps: number; tapsPrev: number };

/** Last 7 days vs the 7 days before (unique phones), for the trend badges. */
export async function getWeekComparison(): Promise<WeekComparison> {
  const q = await sql();
  const recent = "e.created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY";
  const earlier = "e.created_at <  UTC_TIMESTAMP() - INTERVAL 7 DAY";
  const [row] = await q`
    SELECT
      ${phones(q, `${SCAN} AND ${recent}`)}  AS scans,
      ${phones(q, `${SCAN} AND ${earlier}`)} AS scansPrev,
      ${phones(q, `${TAP} AND ${recent}`)}   AS taps,
      ${phones(q, `${TAP} AND ${earlier}`)}  AS tapsPrev
    FROM ${counted(q)} e
    WHERE e.created_at >= UTC_TIMESTAMP() - INTERVAL 14 DAY`;
  return {
    scans: num(row?.scans),
    scansPrev: num(row?.scansPrev),
    taps: num(row?.taps),
    tapsPrev: num(row?.tapsPrev),
  };
}

/** Unique phones across all drivers for a month (Nepal time). */
export async function getMonthActivity(period: string): Promise<Activity> {
  const q = await sql();
  const [row] = await q`
    SELECT ${phones(q, SCAN)} AS scans, ${phones(q, TAP)} AS storeTaps,
           ${phones(q, PLAY)} AS androidDownloads, ${phones(q, APPSTORE)} AS iosDownloads
    FROM ${counted(q)} e
    WHERE ${monthRange(q, period)}`;
  return activity(row);
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
    SELECT c.id, c.driver_id AS driverId, d.name AS driverName, c.event_type AS eventType,
           c.platform, c.store, c.created_at AS createdAt
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
    SELECT e.driver_id AS driverId, ${phones(q, PLAY)} AS androidDownloads, ${phones(q, APPSTORE)} AS iosDownloads
    FROM ${counted(q)} e
    WHERE e.event_type = 'store_click' ${period ? q`AND ${monthRange(q, period)}` : q``}
    GROUP BY e.driver_id`;
  return new Map(
    rows.map((r) => [
      r.driverId as string,
      { androidDownloads: num(r.androidDownloads), iosDownloads: num(r.iosDownloads) },
    ]),
  );
}
