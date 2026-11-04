import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Ban, ChevronLeft, ChevronRight, Coins, Hourglass, ShieldCheck } from "lucide-react";
import { Card, CardHeader, PageHeader, StatCard } from "@/components/admin/ui";
import { currentPeriod, isPeriod, periodLabel, shiftPeriod } from "@/lib/period";
import { listRewards, listTiers, syncRewards } from "@/lib/rewards";
import { requireAdmin } from "@/lib/session";
import { RewardsTable } from "./RewardsTable";
import { TierEditor } from "./TierEditor";

export const metadata = { title: "Rewards · Admin" };

export default function RewardsPage(props: PageProps<"/admin/rewards">) {
  return (
    <Suspense fallback={<div className="h-[480px] animate-pulse rounded-2xl bg-ink/[0.06]" />}>
      <Rewards searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Rewards({ searchParams }: { searchParams: PageProps<"/admin/rewards">["searchParams"] }) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;
  const now = currentPeriod();
  const period = isPeriod(sp.month) && sp.month <= now ? sp.month : now;

  await syncRewards();
  const [rewards, tiers] = await Promise.all([listRewards({ period }), listTiers()]);
  const sum = (s: string) => rewards.filter((r) => r.status === s).reduce((t, r) => t + r.amountNpr, 0);
  const count = (s: string) => rewards.filter((r) => r.status === s).length;

  const monthSwitcher = (
    <div className="flex items-center rounded-xl border border-ink/15 bg-white p-1 shadow-sm">
      <Link href={`/admin/rewards?month=${shiftPeriod(period, -1)}`} className="rounded-lg p-1.5 hover:bg-ink/5" aria-label="Previous month">
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="min-w-36 text-center text-sm font-bold">{periodLabel(period)}</span>
      {period < now ? (
        <Link href={`/admin/rewards?month=${shiftPeriod(period, 1)}`} className="rounded-lg p-1.5 hover:bg-ink/5" aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="w-7" />
      )}
    </div>
  );

  return (
    <>
      <PageHeader title="Rewards" description="Set monthly targets and pay drivers who reach them." actions={monthSwitcher} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4 [&>*:first-child]:col-span-2 sm:[&>*:first-child]:col-span-1">
        <StatCard highlight label="To pay" value={`Rs ${sum("pending").toLocaleString()}`} icon={Hourglass} sub={`${count("pending")} pending reward${count("pending") === 1 ? "" : "s"}`} />
        <StatCard label="Paid" value={`Rs ${sum("paid").toLocaleString()}`} icon={Coins} sub={`${count("paid")} reward${count("paid") === 1 ? "" : "s"} in ${periodLabel(period)}`} />
        <StatCard label="Cancelled" value={`Rs ${sum("cancelled").toLocaleString()}`} icon={Ban} sub={`${count("cancelled")} cancelled`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <Card flush className="min-w-0">
          <div className="p-5 sm:p-6">
            <CardHeader title="Payouts" description={`Rewards earned in ${periodLabel(period)}. Pay, then mark as paid.`} />
          </div>
          <RewardsTable rows={rewards} />
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Monthly targets" description="Counts reset on the 1st of every month (Nepal time)." className="mb-4" />
            <TierEditor tiers={tiers} />
          </Card>
          <Card className="bg-gradient-to-br from-brand-light/50 to-white">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
              </span>
              <div className="text-sm">
                <h2 className="font-bold">What counts as a referral</h2>
                <ul className="mt-2 space-y-1.5 text-ink/70">
                  <li>• A rider’s phone that tapped Google Play or App Store on the driver’s page.</li>
                  <li>• Each phone counts once, for the first driver who referred it.</li>
                  <li>• Phones a driver has logged in from never count (no self-referrals).</li>
                  <li>• Rewards start as <b>pending</b>: check, pay, then mark as paid.</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
