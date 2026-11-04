import Link from "next/link";
import { Ban, CheckCircle2, Gift, RotateCcw } from "lucide-react";
import { Avatar, Badge, EmptyState, td, th } from "@/components/admin/ui";
import { SubmitButton } from "@/components/SubmitButton";
import { periodLabel } from "@/lib/period";
import type { RewardRow } from "@/lib/rewards";
import { setRewardStatusAction } from "./actions";

const STATUS = {
  pending: { tone: "amber", label: "Pending" },
  paid: { tone: "green", label: "Paid" },
  cancelled: { tone: "neutral", label: "Cancelled" },
} as const;

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Kathmandu" });

export function RewardsTable({ rows, showDriver = true }: { rows: RewardRow[]; showDriver?: boolean }) {
  if (rows.length === 0) {
    return (
      <EmptyState icon={Gift} title="No rewards yet">
        Rewards appear here automatically when a driver reaches a monthly target.
      </EmptyState>
    );
  }
  return (
    <>
    {/* Phones: one card per reward */}
    <ul className="divide-y divide-ink/[0.06] border-t border-ink/[0.06] sm:hidden">
      {rows.map((r) => (
        <li key={r.id} className={`space-y-2.5 px-4 py-4 ${r.status === "cancelled" ? "opacity-60" : ""}`}>
          <div className="flex items-start gap-3">
            {showDriver && <Avatar name={r.driverName ?? r.driverId} size="sm" />}
            <div className="min-w-0 flex-1">
              {showDriver && (
                <Link href={`/admin/drivers/${r.driverId}`} className="block truncate text-sm font-semibold">
                  {r.driverName ?? r.driverId} <span className="font-normal text-ink/45">· {r.driverId}</span>
                </Link>
              )}
              <p className={`text-sm ${showDriver ? "text-ink/70" : "font-semibold"} ${r.status === "cancelled" ? "line-through" : ""}`}>{r.reward}</p>
              <p className="text-xs text-ink/45">
                {r.target} referrals · {periodLabel(r.period)}
              </p>
            </div>
            <span className="text-sm font-extrabold tabular-nums">Rs {r.amountNpr.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={STATUS[r.status].tone} dot>
              {STATUS[r.status].label}
            </Badge>
            {r.paidAt && <span className="text-xs text-ink/45">on {dateFmt.format(new Date(r.paidAt))}</span>}
            <div className="ml-auto flex gap-1">
              {r.status === "pending" ? (
                <>
                  <form action={setRewardStatusAction.bind(null, r.id, "paid")}>
                    <SubmitButton className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                    </SubmitButton>
                  </form>
                  <form action={setRewardStatusAction.bind(null, r.id, "cancelled")}>
                    <SubmitButton spinner={false} aria-label="Cancel reward" className="rounded-lg p-2 text-ink/40 disabled:opacity-50">
                      <Ban className="h-4 w-4" />
                    </SubmitButton>
                  </form>
                </>
              ) : (
                <form action={setRewardStatusAction.bind(null, r.id, "pending")}>
                  <SubmitButton spinner={false} aria-label="Move back to pending" className="rounded-lg p-2 text-ink/40 disabled:opacity-50">
                    <RotateCcw className="h-4 w-4" />
                  </SubmitButton>
                </form>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
    <div className="hidden overflow-x-auto border-t border-ink/[0.06] sm:block">
      <table className="w-full text-sm">
        <thead className="bg-ink/[0.02]">
          <tr>
            {showDriver && <th className={th}>Driver</th>}
            <th className={th}>Reward</th>
            <th className={`${th} text-right`}>Amount</th>
            <th className={th}>Status</th>
            <th className={`${th} text-right`}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/[0.05]">
          {rows.map((r) => (
            <tr key={r.id} className={r.status === "cancelled" ? "opacity-60" : ""}>
              {showDriver && (
                <td className={td}>
                  <Link href={`/admin/drivers/${r.driverId}`} className="group flex items-center gap-3">
                    <Avatar name={r.driverName ?? r.driverId} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold group-hover:underline">{r.driverName ?? r.driverId}</span>
                      <span className="text-xs text-ink/45">
                        {r.driverId}
                        {r.driverPhone && ` · ${r.driverPhone}`}
                      </span>
                    </span>
                  </Link>
                </td>
              )}
              <td className={td}>
                <div className={`font-semibold ${r.status === "cancelled" ? "line-through" : ""}`}>{r.reward}</div>
                <div className="text-xs text-ink/45">
                  {r.target} referrals · {periodLabel(r.period)} · earned {dateFmt.format(new Date(r.createdAt))}
                </div>
              </td>
              <td className={`${td} whitespace-nowrap text-right font-bold tabular-nums`}>Rs {r.amountNpr.toLocaleString()}</td>
              <td className={td}>
                <Badge tone={STATUS[r.status].tone} dot>
                  {STATUS[r.status].label}
                </Badge>
                {r.paidAt && <div className="mt-1 text-xs text-ink/45">on {dateFmt.format(new Date(r.paidAt))}</div>}
              </td>
              <td className={td}>
                <div className="flex justify-end gap-1">
                  {r.status === "pending" ? (
                    <>
                      <form action={setRewardStatusAction.bind(null, r.id, "paid")}>
                        <SubmitButton className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Mark paid
                        </SubmitButton>
                      </form>
                      <form action={setRewardStatusAction.bind(null, r.id, "cancelled")}>
                        <SubmitButton spinner={false} aria-label="Cancel reward" title="Cancel (e.g. suspected fraud)" className="rounded-lg p-1.5 text-ink/40 hover:bg-pin/10 hover:text-pin disabled:opacity-50">
                          <Ban className="h-4 w-4" />
                        </SubmitButton>
                      </form>
                    </>
                  ) : (
                    <form action={setRewardStatusAction.bind(null, r.id, "pending")}>
                      <SubmitButton spinner={false} aria-label="Move back to pending" title="Move back to pending" className="rounded-lg p-1.5 text-ink/40 hover:bg-ink/5 hover:text-ink disabled:opacity-50">
                        <RotateCcw className="h-4 w-4" />
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
