import "server-only";
import type postgres from "postgres";
import { sql } from "./db";
import { currentPeriod } from "./period";

/**
 * A "qualified referral" is a rider's device that tapped a store button, credited to the
 * FIRST driver whose link it came through (first touch), in the month of that first tap.
 *
 * - One device counts once, ever — repeat taps or a second driver's link don't count again.
 * - Devices a driver has logged into the portal from are excluded (no self-referrals).
 * - Device = the nc_dev cookie; when missing, IP + user agent is used instead.
 */
function firstTouches(q: postgres.Sql) {
  return q`
    SELECT DISTINCT ON (dkey) dkey, driver_id, created_at
    FROM (
      SELECT COALESCE(c.device_id::text, 'ip:' || COALESCE(c.ip_address, '') || '|' || md5(COALESCE(c.user_agent, ''))) AS dkey,
             c.driver_id, c.created_at
      FROM referral_clicks c
      WHERE c.event_type = 'store_click'
        AND NOT EXISTS (SELECT 1 FROM driver_devices d WHERE d.device_id = c.device_id)
    ) x
    ORDER BY dkey, created_at`;
}

const periodStart = (q: postgres.Sql, period: string) =>
  q`((${period} || '-01')::timestamp AT TIME ZONE 'Asia/Kathmandu')`;

/** Qualified referrals per registered, active driver for a month (or all time with `null`). */
export async function qualifiedCounts(period: string | null = currentPeriod()): Promise<Map<string, number>> {
  const q = await sql();
  const rows = await q`
    WITH firsts AS (${firstTouches(q)})
    SELECT f.driver_id, count(*)::int AS n
    FROM firsts f
    JOIN drivers d ON d.id = f.driver_id AND d.active
    ${period ? q`WHERE f.created_at >= ${periodStart(q, period)} AND f.created_at < ${periodStart(q, period)} + interval '1 month'` : q``}
    GROUP BY f.driver_id`;
  return new Map(rows.map((r) => [r.driver_id as string, r.n as number]));
}

/** Lifetime qualified referrals for one driver. */
export async function lifetimeQualified(driverId: string): Promise<number> {
  const q = await sql();
  const [row] = await q`
    WITH firsts AS (${firstTouches(q)})
    SELECT count(*)::int AS n FROM firsts WHERE driver_id = ${driverId}`;
  return row.n;
}

/** Qualified referrals per day (Nepal time) for one driver, last `days` days, zero-filled. */
export async function dailyQualified(driverId: string, days = 14): Promise<{ day: string; n: number }[]> {
  const q = await sql();
  const rows = await q`
    WITH firsts AS (${firstTouches(q)}),
    series AS (
      SELECT generate_series(
        (now() AT TIME ZONE 'Asia/Kathmandu')::date - ${days - 1}::int,
        (now() AT TIME ZONE 'Asia/Kathmandu')::date,
        interval '1 day')::date AS day
    )
    SELECT to_char(s.day, 'YYYY-MM-DD') AS day, count(f.dkey)::int AS n
    FROM series s
    LEFT JOIN firsts f ON f.driver_id = ${driverId} AND (f.created_at AT TIME ZONE 'Asia/Kathmandu')::date = s.day
    GROUP BY s.day ORDER BY s.day`;
  return rows as unknown as { day: string; n: number }[];
}

/**
 * Creates a pending reward for every active tier each driver has reached this month.
 * Idempotent (unique on driver + month + tier). Only the current month is synced, so
 * editing tiers later never re-awards past months.
 */
export async function syncRewards(): Promise<void> {
  const period = currentPeriod();
  const q = await sql();
  await q`
    WITH firsts AS (${firstTouches(q)}),
    counts AS (
      SELECT f.driver_id, count(*)::int AS n
      FROM firsts f
      JOIN drivers d ON d.id = f.driver_id AND d.active
      WHERE f.created_at >= ${periodStart(q, period)}
        AND f.created_at <  ${periodStart(q, period)} + interval '1 month'
      GROUP BY f.driver_id
    )
    INSERT INTO driver_rewards (driver_id, period, tier_id, target, reward, amount_npr)
    SELECT c.driver_id, ${period}, t.id, t.target, t.reward, t.amount_npr
    FROM counts c
    JOIN reward_tiers t ON t.active AND t.target <= c.n
    ON CONFLICT (driver_id, period, tier_id) DO NOTHING`;
}

export type Tier = { id: number; target: number; reward: string; amountNpr: number; active: boolean };

export async function listTiers(onlyActive = false): Promise<Tier[]> {
  const q = await sql();
  const rows = await q`
    SELECT id, target, reward, amount_npr AS "amountNpr", active
    FROM reward_tiers
    ${onlyActive ? q`WHERE active` : q``}
    ORDER BY target, id`;
  return rows as unknown as Tier[];
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
    SELECT r.id, r.driver_id AS "driverId", d.name AS "driverName", d.phone AS "driverPhone",
           r.period, r.target, r.reward, r.amount_npr AS "amountNpr", r.status,
           r.created_at AS "createdAt", r.paid_at AS "paidAt"
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
    SET status = ${status}, paid_at = ${status === "paid" ? q`now()` : null}
    WHERE id = ${id}`;
}
