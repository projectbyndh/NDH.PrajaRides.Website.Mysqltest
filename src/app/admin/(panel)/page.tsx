import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, CalendarCheck, CalendarClock, ClipboardList, Database, Inbox, MousePointerClick, ScanLine, Trophy, UserCheck, Zap } from "lucide-react";
import { AreaChart, Donut, Funnel } from "@/components/admin/charts";
import { AppleGlyph, PlayGlyph } from "@/components/StoreBadges";
import { Avatar, Badge, Card, CardHeader, change, EmptyState, PageHeader, StatCard } from "@/components/admin/ui";
import { getDaily, getLeaderboard, getMonthActivity, getRecentActivity, getTotals, getWeekComparison, type ActivityRow } from "@/lib/db";
import { countPendingApplications } from "@/lib/applications";
import { countUnreadMessages } from "@/lib/contact";
import { countNewBookings } from "@/lib/bookings";
import { listDrivers, listExpiringDocuments, type ExpiringDocument } from "@/lib/drivers";
import { currentPeriod, periodLabel } from "@/lib/period";
import { listRewards, qualifiedCounts, syncRewards } from "@/lib/rewards";
import { requireAdmin } from "@/lib/session";
import { siteUrl } from "@/lib/site";
import { AdminWorkspace } from "./AdminWorkspace";

export const metadata = { title: "Overview · Admin" };

const Play = ({ className }: { className?: string }) => <PlayGlyph className={className} />;
const Apple = ({ className }: { className?: string }) => <AppleGlyph className={className} />;

export default function AdminPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  await connection();
  await requireAdmin();
  const period = currentPeriod();

  let data;
  try {
    await syncRewards();
    data = await Promise.all([
      getTotals(),
      getLeaderboard(),
      getDaily(30),
      qualifiedCounts(),
      getWeekComparison(),
      getMonthActivity(period),
      getRecentActivity(8),
      listDrivers(),
      listRewards({ period }),
      siteUrl(),
      countPendingApplications(),
      countUnreadMessages(),
      listExpiringDocuments(30),
      countNewBookings(),
    ]);
  } catch (err) {
    console.error("[admin] database error", err);
    return (
      <Card>
        <EmptyState icon={Database} title="Can’t reach the database">
          Check that <code className="rounded bg-ink/5 px-1">DATABASE_URL</code> is set in the server environment and restart the app.
        </EmptyState>
      </Card>
    );
  }
  const [totals, rows, daily, qualified, week, month, activity, drivers, rewards, baseUrl, pendingApps, unreadMessages, expiring, newBookings] = data;

  const activeDrivers = drivers.filter((d) => d.active);
  const qualifiedTotal = [...qualified.values()].reduce((s, n) => s + n, 0);
  const pendingRewards = rewards.filter((r) => r.status === "pending");
  const top = activeDrivers
    .map((d) => ({ ...d, n: qualified.get(d.id) ?? 0 }))
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  return (
    <>
      <PageHeader
        title="Overview"
        description={`Referral performance · ${periodLabel(period)} · every number counts each phone once`}
      />

      <NeedsAttention newBookings={newBookings} pendingApps={pendingApps} unread={unreadMessages} expiring={expiring} pendingRewards={pendingRewards.length} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard highlight label="Scans (7 days)" value={week.scans} icon={ScanLine} delta={change(week.scans, week.scansPrev)} sub={`${totals.scans.toLocaleString()} all time · ${totals.scansToday} today`} />
        <StatCard label="Android downloads" value={month.androidDownloads} icon={Play} sub={`This month · ${totals.androidDownloads.toLocaleString()} all time`} />
        <StatCard label="iPhone downloads" value={month.iosDownloads} icon={Apple} sub={`This month · ${totals.iosDownloads.toLocaleString()} all time`} />
        <StatCard label="Qualified referrals" value={qualifiedTotal} icon={UserCheck} sub={`This month · ${activeDrivers.length} active drivers`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Scans, last 30 days" description="Unique phones per day · Nepal time" className="mb-5" />
          <AreaChart data={daily.map((d) => ({ day: d.day, value: d.scans }))} label="phones" />
        </Card>
        <Card>
          <CardHeader title="Devices" description="Unique phones that scanned, all time" className="mb-5" />
          <Donut
            centerLabel="scans"
            segments={[
              { label: "Android", value: totals.android, color: "#10b981" },
              { label: "iPhone", value: totals.ios, color: "#1f2124" },
              { label: "Desktop", value: totals.desktop, color: "#f5b81c" },
            ]}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="This month’s funnel" description={periodLabel(period)} className="mb-5" />
          <Funnel
            steps={[
              { label: "Link opened", value: month.scans, hint: "QR scans and link clicks" },
              { label: "Store tapped", value: month.androidDownloads + month.iosDownloads, hint: `${month.androidDownloads} Android (Google Play) · ${month.iosDownloads} iPhone (App Store)` },
              { label: "Qualified", value: qualifiedTotal, hint: "Unique new phones, registered drivers" },
            ]}
          />
        </Card>

        <Card flush>
          <div className="p-5 pb-3 sm:p-6 sm:pb-3">
            <CardHeader title="Top drivers" description="Qualified referrals this month" action={<Link href="/admin/drivers" className="text-sm font-semibold text-ink/55 hover:text-ink">All →</Link>} />
          </div>
          {top.length === 0 ? (
            <EmptyState icon={Trophy} title="No drivers yet">
              Add drivers to start the leaderboard.
            </EmptyState>
          ) : (
            <ol className="divide-y divide-ink/[0.06]">
              {top.map((d, i) => (
                <li key={d.id}>
                  <Link href={`/admin/drivers/${d.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ink/[0.02] sm:px-6">
                    <span className={`w-5 text-center text-sm font-bold ${i === 0 ? "text-brand-dark" : "text-ink/35"}`}>{i + 1}</span>
                    <Avatar name={d.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{d.name}</span>
                      <span className="text-xs text-ink/45">{d.id}</span>
                    </span>
                    <span className="text-lg font-extrabold tabular-nums">{d.n}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card flush>
          <div className="p-5 pb-3 sm:p-6 sm:pb-3">
            <CardHeader title="Live activity" description="Latest scans and store taps" />
          </div>
          {activity.length === 0 ? (
            <EmptyState icon={Zap} title="Nothing yet">
              Activity appears here as soon as someone scans a QR.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-ink/[0.06]">
              {activity.map((a) => (
                <ActivityItem key={a.id} a={a} />
              ))}
            </ul>
          )}
        </Card>
      </div>

      <AdminWorkspace
        rows={rows.map((r) => ({ ...r, qualified: qualified.get(r.driverId) ?? 0 }))}
        baseUrl={baseUrl}
        drivers={Object.fromEntries(drivers.map((d) => [d.id, { name: d.name, phone: d.phone, refCode: d.refCode }]))}
      />
    </>
  );
}

function NeedsAttention({ newBookings, pendingApps, unread, expiring, pendingRewards }: { newBookings: number; pendingApps: number; unread: number; expiring: ExpiringDocument[]; pendingRewards: number }) {
  const items = [
    newBookings > 0 && { href: "/admin/bookings", icon: CalendarCheck, tone: "bg-emerald-50 text-emerald-800 ring-emerald-600/15", text: `${newBookings} new ride booking${newBookings > 1 ? "s" : ""}` },
    pendingApps > 0 && { href: "/admin/applications", icon: ClipboardList, tone: "bg-sky-50 text-sky-800 ring-sky-600/15", text: `${pendingApps} driver application${pendingApps > 1 ? "s" : ""} to review` },
    unread > 0 && { href: "/admin/messages", icon: Inbox, tone: "bg-violet-50 text-violet-800 ring-violet-600/15", text: `${unread} unread message${unread > 1 ? "s" : ""}` },
    pendingRewards > 0 && { href: "/admin/rewards", icon: Trophy, tone: "bg-amber-50 text-amber-800 ring-amber-600/20", text: `${pendingRewards} reward${pendingRewards > 1 ? "s" : ""} to pay` },
  ].filter(Boolean) as { href: string; icon: typeof Inbox; tone: string; text: string }[];
  if (items.length === 0 && expiring.length === 0) return null;

  return (
    <div className="space-y-3">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map(({ href, icon: Icon, tone, text }) => (
            <Link key={href} href={href} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold ring-1 transition hover:brightness-95 ${tone}`}>
              <Icon className="h-4 w-4" /> {text} <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      )}
      {expiring.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-700" />
            <h2 className="font-bold">Documents expiring</h2>
            <span className="text-sm text-ink/50">within 30 days or already expired</span>
          </div>
          <ul className="mt-3 divide-y divide-amber-900/[0.06]">
            {expiring.slice(0, 8).map((x) => (
              <li key={`${x.driverId}-${x.document}`} className="flex items-center gap-3 py-2 text-sm">
                <Link href={`/admin/drivers/${x.driverId}`} className="min-w-0 flex-1 truncate font-semibold hover:underline">
                  {x.name} <span className="font-normal text-ink/45">· {x.driverId}</span>
                </Link>
                <span className="text-ink/60">{x.document}</span>
                <Badge tone={x.daysLeft < 0 ? "red" : "amber"} dot>
                  {x.daysLeft < 0 ? `Expired ${-x.daysLeft}d ago` : x.daysLeft === 0 ? "Today" : `${x.daysLeft}d left`}
                </Badge>
              </li>
            ))}
          </ul>
          {expiring.length > 8 && <p className="mt-2 text-xs text-ink/50">+{expiring.length - 8} more</p>}
        </Card>
      )}
    </div>
  );
}

const ago = (d: Date) => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

function ActivityItem({ a }: { a: ActivityRow }) {
  const tap = a.eventType === "store_click";
  const platform = a.platform === "ios" ? "iPhone" : a.platform === "android" ? "Android" : "Desktop";
  return (
    <li className="flex items-center gap-3 px-5 py-3 sm:px-6">
      <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tap ? "bg-emerald-50 text-emerald-600" : "bg-brand-light/70 text-ink"}`}>
        {tap ? <MousePointerClick className="h-4 w-4" /> : <ScanLine className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block truncate">
          <span className="font-semibold">{a.driverName ?? a.driverId}</span>{" "}
          <span className="text-ink/55">{tap ? `→ ${a.store === "appstore" ? "App Store" : "Google Play"}` : "scanned"}</span>
        </span>
        <span className="text-xs text-ink/45">{platform}</span>
      </span>
      <Badge>{ago(a.createdAt)}</Badge>
    </li>
  );
}

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-9 w-56 rounded-lg bg-ink/[0.06]" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-2xl bg-ink/[0.06]" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="h-72 rounded-2xl bg-ink/[0.06] xl:col-span-2" />
        <div className="h-72 rounded-2xl bg-ink/[0.06]" />
      </div>
    </div>
  );
}
