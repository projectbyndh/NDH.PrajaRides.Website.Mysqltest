"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bike, Car, LayoutGrid, List, Mail, MoreHorizontal, Phone, Search, Trophy, Users } from "lucide-react";
import { AppleGlyph, PlayGlyph } from "@/components/StoreBadges";
import { Avatar, Badge, EmptyState, td, th } from "@/components/admin/ui";
import { onboardingStage } from "@/lib/validation";
import type { Driver } from "@/lib/drivers";
import type { Tier } from "@/lib/rewards";
import { DeleteDriverButton, EditDriverButton, ViewDriverLink } from "./DriverActions";
import { Select } from "@/components/Select";

export type DriverListRow = Driver & {
  month: number; // qualified referrals this month
  lifetime: number;
  android: number; // downloads this month
  ios: number;
  androidAll: number;
  iosAll: number;
  rank: number | null; // this month, among active drivers with ≥1 referral
};

type Filter = "all" | "active" | "inactive";
type Sort = "top" | "newest" | "name";
type View = "cards" | "table";

const VehicleIcon = ({ type, className }: { type: Driver["vehicleType"]; className?: string }) =>
  type === "bike" ? <Bike className={className} /> : type === "other" ? <MoreHorizontal className={className} /> : <Car className={className} />;

function nextTier(tiers: Tier[], n: number) {
  const next = tiers.find((t) => t.target > n);
  const prev = [...tiers].reverse().find((t) => t.target <= n)?.target ?? 0;
  return next ? { next, pct: Math.max(4, ((n - prev) / (next.target - prev)) * 100) } : null;
}

const RANK_STYLE = ["bg-amber-400 text-ink", "bg-slate-300 text-ink", "bg-orange-300 text-ink"];

export function DriversView({ rows, tiers, monthLabel }: { rows: DriverListRow[]; tiers: Tier[]; monthLabel: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("top");
  const [view, setView] = useState<View>("cards");

  const counts = { all: rows.length, active: rows.filter((r) => r.active).length, inactive: rows.filter((r) => !r.active).length };
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (filter === "all" || (filter === "active") === r.active) &&
        (!q || [r.name, r.id, r.phone, r.email, r.vehicleNo, r.address].some((x) => x?.toLowerCase().includes(q))),
    );
    return list.sort((a, b) =>
      sort === "name" ? a.name.localeCompare(b.name) : sort === "newest" ? +new Date(b.createdAt) - +new Date(a.createdAt) : b.month - a.month || b.lifetime - a.lifetime,
    );
  }, [rows, query, filter, sort]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-white p-1 shadow-sm ring-1 ring-ink/[0.08]" role="tablist" aria-label="Filter by status">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={filter === f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold capitalize transition ${filter === f ? "bg-ink text-white shadow-sm" : "text-ink/55 hover:text-ink"}`}
            >
              {f} <span className={`ml-0.5 text-xs ${filter === f ? "text-white/60" : "text-ink/35"}`}>{counts[f]}</span>
            </button>
          ))}
        </div>
        <label className="order-first flex w-full min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-ink/[0.08] focus-within:ring-2 focus-within:ring-brand-dark sm:order-none sm:w-auto sm:flex-1 sm:py-2 sm:max-w-xs">
          <Search className="h-4 w-4 shrink-0 text-ink/40" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, vehicle…" className="w-full min-w-0 bg-transparent text-sm outline-none" aria-label="Search drivers" />
        </label>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label="Sort drivers"
            className="rounded-xl bg-white px-3 py-2 text-sm font-medium shadow-sm outline-none ring-1 ring-ink/[0.08] focus:ring-2 focus:ring-brand-dark"
          >
            <option value="top">Top this month</option>
            <option value="newest">Newest first</option>
            <option value="name">Name A–Z</option>
          </Select>
          <div className="hidden rounded-xl bg-white p-1 shadow-sm ring-1 ring-ink/[0.08] sm:flex" aria-label="View">
            {([
              ["cards", LayoutGrid, "Card view"],
              ["table", List, "Table view"],
            ] as const).map(([v, Icon, label]) => (
              <button key={v} onClick={() => setView(v)} aria-pressed={view === v} title={label} className={`rounded-lg p-1.5 transition ${view === v ? "bg-brand text-ink" : "text-ink/45 hover:text-ink"}`}>
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white ring-1 ring-ink/[0.08]">
          <EmptyState icon={Users} title={rows.length ? "No drivers match" : "No drivers yet"}>
            {rows.length ? "Try another search or filter." : "Click “Add driver” to register your first driver."}
          </EmptyState>
        </div>
      ) : (
        <>
          {/* Cards always on phones; the table is a wide-screen option. */}
          <div className={`grid gap-4 sm:grid-cols-2 2xl:grid-cols-3 ${view === "table" ? "sm:hidden" : ""}`}>
            {filtered.map((d) => (
              <DriverCard key={d.id} d={d} tiers={tiers} monthLabel={monthLabel} />
            ))}
          </div>
          {view === "table" && (
            <div className="hidden sm:block">
              <DriverTable rows={filtered} monthLabel={monthLabel} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-ink/[0.03] px-3 py-2.5">
      <div className="flex items-center gap-1 text-[11px] font-semibold text-ink/50">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-xl font-extrabold tabular-nums">{value}</div>
    </div>
  );
}

function DriverCard({ d, tiers, monthLabel }: { d: DriverListRow; tiers: Tier[]; monthLabel: string }) {
  const progress = d.active ? nextTier(tiers, d.month) : null;
  return (
    <article className={`group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(31,33,36,0.05)] ring-1 ring-ink/[0.08] transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-ink/[0.06] ${d.active ? "" : "opacity-70"}`}>
      <div className={`h-16 ${d.active ? "bg-gradient-to-br from-brand via-brand-light/80 to-brand-light/30" : "bg-ink/[0.06]"}`} />
      {d.rank && d.rank <= 3 && (
        <span className={`absolute right-4 top-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold shadow-sm ${RANK_STYLE[d.rank - 1]}`}>
          <Trophy className="h-3.5 w-3.5" /> #{d.rank}
        </span>
      )}

      <div className="-mt-9 flex flex-1 flex-col px-5 pb-4">
        <Link href={`/admin/drivers/${d.id}`} className="flex items-end gap-3">
          <span className="rounded-full ring-4 ring-white">
            <Avatar name={d.name} size="lg" />
          </span>
          <div className="min-w-0 pb-0.5">
            <h3 className="truncate text-base font-bold group-hover:underline">{d.name}</h3>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="dark">{d.id}</Badge>
              {d.active ? <Badge tone="green" dot>Active</Badge> : <Badge tone="red" dot>Inactive</Badge>}
              <StageBadge d={d} />
            </div>
          </div>
        </Link>

        <ul className="mt-4 space-y-1.5 text-sm text-ink/70">
          <li className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0 text-ink/35" /> {d.phone}
          </li>
          <li className="flex items-center gap-2">
            <VehicleIcon type={d.vehicleType} className="h-3.5 w-3.5 shrink-0 text-ink/35" />
            {d.vehicleNo ?? <span className="text-ink/35">No vehicle number</span>}
            <span className="text-xs capitalize text-ink/40">· {d.vehicleType}</span>
          </li>
          {d.email && (
            <li className="flex min-w-0 items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-ink/35" /> <span className="truncate">{d.email}</span>
            </li>
          )}
        </ul>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat label={`${monthLabel.slice(0, 3)} referrals`} value={d.month} />
          <Stat label="Android" value={d.android} icon={<PlayGlyph className="h-3 w-3" />} />
          <Stat label="iPhone" value={d.ios} icon={<AppleGlyph className="h-3 w-3" />} />
        </div>

        {progress ? (
          <div className="mt-4">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-ink/70">
                {d.month}/{progress.next.target} → {progress.next.reward}
              </span>
              <span className="text-ink/45">{progress.next.target - d.month} to go</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-dark to-brand" style={{ width: `${progress.pct}%` }} />
            </div>
          </div>
        ) : d.active && tiers.length > 0 ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">All monthly rewards reached 🎉</p>
        ) : null}

        <p className="mt-3 text-xs text-ink/45">
          All time: {d.lifetime} referrals · {d.androidAll} Android · {d.iosAll} iPhone
        </p>
      </div>

      <div className="flex items-center gap-1 border-t border-ink/[0.06] bg-ink/[0.015] px-3 py-2">
        <Link href={`/admin/drivers/${d.id}`} className="mr-auto rounded-lg px-2.5 py-1.5 text-sm font-semibold text-ink/70 hover:bg-ink/5 hover:text-ink">
          View details →
        </Link>
        <EditDriverButton driver={d} variant="icon" />
        <DeleteDriverButton driver={d} variant="icon" />
      </div>
    </article>
  );
}

function DriverTable({ rows, monthLabel }: { rows: DriverListRow[]; monthLabel: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink/[0.08]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ink/[0.02]">
            <tr>
              <th className={th}>Driver</th>
              <th className={th}>Contact</th>
              <th className={th}>Vehicle</th>
              <th className={`${th} text-right`}>{monthLabel}</th>
              <th className={`${th} text-right`} title="Unique phones that tapped Google Play this month">Android</th>
              <th className={`${th} text-right`} title="Unique phones that tapped the App Store this month">iPhone</th>
              <th className={`${th} text-right`}>All time</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.05]">
            {rows.map((d) => (
              <tr key={d.id} className="transition hover:bg-brand-light/20">
                <td className={td}>
                  <Link href={`/admin/drivers/${d.id}`} className="group flex items-center gap-3">
                    <Avatar name={d.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold group-hover:underline">{d.name}</span>
                      <span className="text-xs text-ink/45">
                        {d.id}
                        {d.age ? ` · ${d.age} yrs` : ""}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className={td}>
                  <span className="whitespace-nowrap text-ink/80">{d.phone}</span>
                  {d.email && <span className="block max-w-52 truncate text-xs text-ink/50">{d.email}</span>}
                </td>
                <td className={td}>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-ink/75">
                    <VehicleIcon type={d.vehicleType} className="h-4 w-4 text-ink/35" />
                    {d.vehicleNo ?? <span className="text-ink/30">—</span>}
                  </span>
                </td>
                <td className={`${td} text-right text-base font-extrabold tabular-nums`}>{d.month}</td>
                <td className={`${td} text-right tabular-nums text-ink/70`}>{d.android}</td>
                <td className={`${td} text-right tabular-nums text-ink/70`}>{d.ios}</td>
                <td className={`${td} text-right tabular-nums text-ink/55`}>{d.lifetime}</td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1.5">
                    {d.active ? <Badge tone="green" dot>Active</Badge> : <Badge tone="red" dot>Inactive</Badge>}
                    <StageBadge d={d} />
                  </div>
                </td>
                <td className={td}>
                  <div className="flex justify-end">
                    <ViewDriverLink id={d.id} variant="icon" />
                    <EditDriverButton driver={d} variant="icon" />
                    <DeleteDriverButton driver={d} variant="icon" />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Sign-up progress for drivers approved from the website form (nothing once verified). */
function StageBadge({ d }: { d: Driver }) {
  const stage = onboardingStage(d);
  if (stage === "details") return <Badge tone="amber">Awaiting details</Badge>;
  if (stage === "review") return <Badge tone="brand">Needs review</Badge>;
  return null;
}
