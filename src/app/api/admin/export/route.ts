import { getLeaderboard } from "@/lib/db";
import { listDrivers } from "@/lib/drivers";
import { qualifiedCounts } from "@/lib/rewards";

const csv = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Driver leaderboard as CSV (protected by src/proxy.ts).
export async function GET() {
  const [rows, month, drivers] = await Promise.all([getLeaderboard(10_000), qualifiedCounts(), listDrivers()]);
  // All counts are unique phones (repeat taps from one phone count once; drivers' own phones excluded).
  const header = "driver_id,name,registered,qualified_this_month,scans,scans_android,scans_ios,scans_desktop,android_downloads,ios_downloads,last_active";
  const lines = rows.map((r) =>
    [
      r.driverId, r.name, r.registered, r.registered ? (month.get(r.driverId) ?? 0) : "",
      r.scans, r.android, r.ios, r.desktop, r.androidDownloads, r.iosDownloads, new Date(r.lastActive).toISOString(),
    ].map(csv).join(","),
  );
  // Registered drivers whose link hasn't been opened yet, so the export lists every driver.
  const seen = new Set(rows.map((r) => r.driverId));
  for (const d of drivers) if (!seen.has(d.id)) lines.push([d.id, d.name, true, 0, 0, 0, 0, 0, 0, 0, ""].map(csv).join(","));
  return new Response([header, ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nepcab-referrals-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
