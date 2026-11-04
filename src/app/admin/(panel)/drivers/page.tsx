import { Suspense } from "react";
import { connection } from "next/server";
import { UserCheck, Users } from "lucide-react";
import { AppleGlyph, PlayGlyph } from "@/components/StoreBadges";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { normalizeDriverId } from "@/lib/config";
import { getDownloadsByDriver } from "@/lib/db";
import { listDrivers, nextDriverId } from "@/lib/drivers";
import { currentPeriod, periodLabel } from "@/lib/period";
import { listTiers, qualifiedCounts } from "@/lib/rewards";
import { requireAdmin } from "@/lib/session";
import { siteUrl } from "@/lib/site";
import { AddDriverPanel } from "./DriverForms";
import { DriversView, type DriverListRow } from "./DriversView";

export const metadata = { title: "Drivers · Admin" };

export default function DriversPage(props: PageProps<"/admin/drivers">) {
  return (
    <Suspense fallback={<DriversSkeleton />}>
      <Drivers searchParams={props.searchParams} />
    </Suspense>
  );
}

const Play = ({ className }: { className?: string }) => <PlayGlyph className={className} />;
const Apple = ({ className }: { className?: string }) => <AppleGlyph className={className} />;

async function Drivers({ searchParams }: { searchParams: PageProps<"/admin/drivers">["searchParams"] }) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;
  const prefill = typeof sp.new === "string" ? normalizeDriverId(sp.new) : undefined;
  const period = currentPeriod();

  const [drivers, nextId, month, lifetime, dlMonth, dlAll, tiers, baseUrl] = await Promise.all([
    listDrivers(),
    nextDriverId(),
    qualifiedCounts(period),
    qualifiedCounts(null),
    getDownloadsByDriver(period),
    getDownloadsByDriver(null),
    listTiers(true),
    siteUrl(),
  ]);

  // Rank this month among active drivers with at least one referral.
  const ranked = drivers
    .filter((d) => d.active && (month.get(d.id) ?? 0) > 0)
    .sort((a, b) => (month.get(b.id) ?? 0) - (month.get(a.id) ?? 0));
  const rows: DriverListRow[] = drivers.map((d) => ({
    ...d,
    month: month.get(d.id) ?? 0,
    lifetime: lifetime.get(d.id) ?? 0,
    android: dlMonth.get(d.id)?.androidDownloads ?? 0,
    ios: dlMonth.get(d.id)?.iosDownloads ?? 0,
    androidAll: dlAll.get(d.id)?.androidDownloads ?? 0,
    iosAll: dlAll.get(d.id)?.iosDownloads ?? 0,
    rank: ranked.findIndex((r) => r.id === d.id) + 1 || null,
  }));

  const monthName = periodLabel(period).split(" ")[0];
  const sum = (k: "android" | "ios" | "month") => rows.reduce((s, r) => s + r[k], 0);
  const active = rows.filter((r) => r.active).length;

  return (
    <>
      <PageHeader
        title="Drivers"
        description="Register drivers, manage their logins and see who brings in riders."
        actions={<AddDriverPanel key={prefill ?? "none"} prefillId={prefill === "DIRECT" ? undefined : prefill} nextId={nextId} portalUrl={`${baseUrl}/driver`} />}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard highlight label="Drivers" value={rows.length} icon={Users} sub={`${active} active · ${rows.length - active} inactive`} />
        <StatCard label={`Referrals · ${monthName}`} value={sum("month")} icon={UserCheck} sub="Qualified, counts toward rewards" />
        <StatCard label={`Android · ${monthName}`} value={sum("android")} icon={Play} sub="Phones that tapped Google Play" />
        <StatCard label={`iPhone · ${monthName}`} value={sum("ios")} icon={Apple} sub="Phones that tapped the App Store" />
      </div>

      <DriversView rows={rows} tiers={tiers} monthLabel={monthName} />
    </>
  );
}

function DriversSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-9 w-48 rounded-lg bg-ink/[0.06]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-ink/[0.06]" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-80 rounded-2xl bg-ink/[0.06]" />
        ))}
      </div>
    </div>
  );
}
