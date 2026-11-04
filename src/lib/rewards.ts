import "server-only";
import { sql } from "./db";
import { bool, inNepal, nepalToday, type Sql } from "./mysql";
import { currentPeriod } from "./period";

/**
 * A "qualified referral" is a rider's device that tapped a store button, credited to the
 * FIRST driver whose link it came through (first touch), in the month of that first tap.
 *
 * - One device counts once, ever — repeat taps or a second driver's link don't count again.
 * - Devices a driver has logged into the portal from are excluded (no self-referrals).
 * - Device = the nc_dev cookie; when missing, IP + user agent is used instead.
 */
// Postgres picked the earliest row per device with DISTINCT ON; MySQL has no such clause, so the
// rows are numbered per device by time and only the first is kept - the same "first touch".
function firstTouches(q: Sql) {
  return q`
    SELECT dkey, driver_id, created_at FROM (
      SELECT dkey, driver_id, created_at,
             ROW_NUMBER() OVER (PARTITION BY dkey ORDER BY created_at) AS rn
      FROM (
        SELECT COALESCE(c.device_id, CONCAT('ip:', COALESCE(c.ip_address, ''), '|', MD5(COALESCE(c.user_agent, '')))) AS dkey,
               c.driver_id, c.created_at
        FROM referral_clicks c
        WHERE c.event_type = 'store_click'
          AND NOT EXISTS (SELECT 1 FROM driver_devices d WHERE d.device_id = c.device_id)
      ) x
    ) ranked
    WHERE rn = 1`;
}

/** The UTC instant a 'YYYY-MM' period begins at in Nepal (created_at is stored as UTC). */
const periodStart = (q: Sql, period: string) =>
  q`CONVERT_TZ(CONCAT(${period}, '-01 00:00:00'), '+05:45', '+00:00')`;

/** Qualified referrals per registered, active driver for a month (or all time with `null`). */
export async function qualifiedCounts(period: string | null = currentPeriod()): Promise<Map<string, number>> {
  const q = await sql();
  const rows = await q`
    WITH firsts AS (${firstTouches(q)})
    SELECT f.driver_id, count(*) AS n
    FROM firsts f
    JOIN drivers d ON d.id = f.driver_id AND d.active = 1
    ${period ? q`WHERE f.created_at >= ${periodStart(q, period)} AND f.created_at < ${periodStart(q, period)} + INTERVAL 1 MONTH` : q``}
    GROUP BY f.driver_id`;
  return new Map(rows.map((r) => [r.driver_id as string, Number(r.n)]));
}

/** Lifetime qualified referrals for one driver. */
export async function lifetimeQualified(driverId: string): Promise<number> {
  const q = await sql();
  const [row] = await q`
    WITH firsts AS (${firstTouches(q)})
    SELECT count(*) AS n FROM firsts WHERE driver_id = ${driverId}`;
  return Number(row.n);
}

/** Qualified referrals per day (Nepal time) for one driver, last `days` days, zero-filled. */
export async function dailyQualified(driverId: string, days = 14): Promise<{ day: string; n: number }[]> {
  const q = await sql();
  // generate_series has no MySQL equivalent: the days are built with a recursive CTE instead.
  const rows = await q`
    WITH RECURSIVE firsts AS (${firstTouches(q)}),
    series AS (
      SELECT DATE_SUB(${q.unsafe(nepalToday())}, INTERVAL ${days - 1} DAY) AS day
      UNION ALL
      SELECT day + INTERVAL 1 DAY FROM series WHERE day < ${q.unsafe(nepalToday())}
    )
    SELECT DATE_FORMAT(s.day, '%Y-%m-%d') AS day, count(f.dkey) AS n
    FROM series s
    LEFT JOIN firsts f ON f.driver_id = ${driverId} AND DATE(${q.unsafe(inNepal("f.created_at"))}) = s.day
    GROUP BY s.day ORDER BY s.day`;
  return rows.map((r) => ({ day: r.day as string, n: Number(r.n) }));
}

/**
 * Creates a pending reward for every active tier each driver has reached this month.
 * Idempotent (unique on driver + month + tier). Only the current month is synced, so
 * editing tiers later never re-awards past months.
 */
export async function syncRewards(): Promise<void> {
  const period = currentPeriod();
  const q = await sql();
  // In MySQL the WITH clause belongs to the SELECT inside the INSERT; the unique key on
  // (driver_id, period, tier_id) plus INSERT IGNORE does the work of ON CONFLICT DO NOTHING; and
  // the id column has no default in the schema, so UUID() supplies one per inserted row.
  await q`
    INSERT IGNORE INTO driver_rewards (id, driver_id, period, tier_id, target, reward, amount_npr)
    WITH firsts AS (${firstTouches(q)}),
    counts AS (
      SELECT f.driver_id, count(*) AS n
      FROM firsts f
      JOIN drivers d ON d.id = f.driver_id AND d.active = 1
      WHERE f.created_at >= ${periodStart(q, period)}
        AND f.created_at <  ${periodStart(q, period)} + INTERVAL 1 MONTH
      GROUP BY f.driver_id
    )
    SELECT UUID(), c.driver_id, ${period}, t.id, t.target, t.reward, t.amount_npr
    FROM counts c
    JOIN reward_tiers t ON t.active = 1 AND t.target <= c.n`;
}

export type Tier = { id: number; target: number; reward: string; amountNpr: number; active: boolean };

export async function listTiers(onlyActive = false): Promise<Tier[]> {
  const q = await sql();
  const rows = await q`
    SELECT id, target, reward, amount_npr AS amountNpr, active
    FROM reward_tiers
    ${onlyActive ? q`WHERE active = 1` : q``}
    ORDER BY target, id`;
  return rows.map((r) => ({
    id: Number(r.id),
    target: Number(r.target),
    reward: r.reward as string,
    amountNpr: Number(r.amountNpr),
    active: bool(r.active),
  }));
}

export async function saveTier(t: Omit<Tier, "id"> & { id?: number }): Promise<void> {
  const q = await sql();
  if (t.id) {
    await q`UPDATE reward_tiers SET target = ${t.target}, reward = ${t.reward}, amount_npr = ${t.amountNpr}, active = ${t.active} WHERE id = ${t.id}`;
  } else {
    await q`INSERT INTO reward_tiers (target, reward, amount_npr, active) VALUES (${t.target}, ${t.reward}, ${t.amountNpr}, ${t.active})`;
  }
}

export async function deleteTier(id: number): Promise<void> {
  const q = await sql();
  // Earned rewards keep their own snapshot of the tier, so deleting is safe.
  await q`DELETE FROM reward_tiers WHERE id = ${id}`;
}

export type RewardStatus = "pending" | "paid" | "cancelled";

export type RewardRow = {
  id: string;
  driverId: string;
  driverName: string | null;
  driverPhone: string | null;
  period: string;
  target: number;
  reward: string;
  amountNpr: number;
  status: RewardStatus;
  createdAt: Date;
  paidAt: Date | null;
};

export async function listRewards(filter: { period?: string; driverId?: string }): Promise<RewardRow[]> {
  const q = await sql();
  const rows = await q`
    SELECT r.id, r.driver_id AS driverId, d.name AS driverName, d.phone AS driverPhone,
           r.period, r.target, r.reward, r.amount_npr AS amountNpr, r.status,
           r.created_at AS createdAt, r.paid_at AS paidAt
    FROM driver_rewards r
    LEFT JOIN drivers d ON d.id = r.driver_id
    WHERE true
      ${filter.period ? q`AND r.period = ${filter.period}` : q``}
      ${filter.driverId ? q`AND r.driver_id = ${filter.driverId}` : q``}
    ORDER BY r.period DESC, r.status = 'pending' DESC, r.created_at DESC`;
  return rows as unknown as RewardRow[];
}

export async function setRewardStatus(id: string, status: RewardStatus): Promise<void> {
  const q = await sql();
  await q`
    UPDATE driver_rewards
    SET status = ${status}, paid_at = ${status === "paid" ? q`UTC_TIMESTAMP()` : null}
    WHERE id = ${id}`;
}
