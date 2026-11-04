"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { QrCode, ScanLine, Search, UserPlus } from "lucide-react";
import { Avatar, Badge, Card, CardHeader, EmptyState, td, th } from "@/components/admin/ui";
import { QrGenerator } from "@/components/QrGenerator";
import type { DriverRow } from "@/lib/db";
import { Select } from "@/components/Select";

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kathmandu" });

type Row = DriverRow & { qualified: number };
type Sort = "scans" | "qualified" | "recent";

type DriverInfo = { name: string; phone: string; refCode: string | null };

export function AdminWorkspace({ rows, baseUrl, drivers }: { rows: Row[]; baseUrl: string; drivers: Record<string, DriverInfo> }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("scans");
  const [qrDriver, setQrDriver] = useState(rows.find((r) => r.registered)?.driverId ?? "DRV101");

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    const list = q ? rows.filter((r) => r.driverId.includes(q) || r.name?.toUpperCase().includes(q)) : [...rows];
    return list.sort((a, b) =>
      sort === "qualified" ? b.qualified - a.qualified : sort === "recent" ? +new Date(b.lastActive) - +new Date(a.lastActive) : b.scans - a.scans,
    );
  }, [rows, query, sort]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
      <Card flush className="min-w-0">
        <div className="flex flex-wrap items-center gap-3 p-5 sm:p-6">
          <CardHeader title="Leaderboard" description="Every link that has been scanned, registered or not" className="flex-1" />
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-ink/15 bg-white px-3 py-2 shadow-sm focus-within:border-brand-dark focus-within:ring-4 focus-within:ring-brand/25 sm:w-52 sm:flex-none">
              <Search className="h-4 w-4 text-ink/40" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or ID" className="w-full bg-transparent text-sm outline-none" aria-label="Search drivers" />
            </label>
            <Select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              aria-label="Sort by"
              className="rounded-xl border border-ink/15 bg-white px-3 py-2 text-sm font-medium shadow-sm outline-none focus:ring-4 focus:ring-brand/25"
            >
              <option value="scans">Most scans</option>
              <option value="qualified">Most qualified</option>
              <option value="recent">Recently active</option>
            </Select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={ScanLine} title={rows.length ? "No match" : "No scans yet"}>
            {rows.length ? "Try a different name or ID." : "Generate a QR code and scan it with your phone to test."}
          </EmptyState>
        ) : (
          <>
          {/* Phones: one row per driver */}
          <ul className="divide-y divide-ink/[0.06] border-t border-ink/[0.06] sm:hidden">
            {filtered.map((r) => (
              <li key={r.driverId} className="flex items-center gap-3 px-4 py-3">
                <Avatar name={r.name ?? r.driverId} size="sm" />
                <div className="min-w-0 flex-1">
                  {r.registered ? (
                    <Link href={`/admin/drivers/${r.driverId}`} className="block truncate text-sm font-semibold">
                      {r.name}
                    </Link>
                  ) : (
                    <span className="block truncate text-sm font-semibold">{r.driverId === "DIRECT" ? "Direct visits" : r.driverId}</span>
                  )}
                  <div className="mt-0.5 text-xs text-ink/50">
                    {r.registered ? r.driverId : r.driverId === "DIRECT" ? "No driver link" : (
                      <Link href={`/admin/drivers?new=${r.driverId}`} className="font-semibold text-pin">
                        Not registered — add
                      </Link>
                    )}
                    {" · "}
                    {r.scans} scans · {r.androidDownloads} Android · {r.iosDownloads} iPhone
                  </div>
                </div>
                {r.registered && <Badge tone="brand">{r.qualified}</Badge>}
                {r.driverId !== "DIRECT" && (
                  <button
                    onClick={() => {
                      setQrDriver(r.driverId);
                      document.getElementById("qr-tool")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    aria-label={`Show QR for ${r.driverId}`}
                    className={`rounded-lg p-2 ${qrDriver === r.driverId ? "bg-brand text-ink" : "text-ink/40"}`}
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto border-t border-ink/[0.06] sm:block">
            <table className="w-full text-sm">
              <thead className="bg-ink/[0.02]">
                <tr>
                  <th className={th}>Driver</th>
                  <th className={`${th} text-right`} title="Unique phones that tapped a store button this month">Qualified</th>
                  <th className={`${th} text-right`}>Scans</th>
                  <th className={`${th} text-right`} title="Unique phones that tapped Google Play (all time)">Android ↓</th>
                  <th className={`${th} text-right`} title="Unique phones that tapped the App Store (all time)">iPhone ↓</th>
                  <th className={th}>Last active</th>
                  <th className={th}><span className="sr-only">QR</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.05] tabular-nums">
                {filtered.map((r) => (
                  <tr key={r.driverId} className="transition hover:bg-brand-light/20">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name ?? r.driverId} size="sm" />
                        <div className="min-w-0">
                          {r.registered ? (
                            <Link href={`/admin/drivers/${r.driverId}`} className="block truncate font-semibold hover:underline">
                              {r.name}
                            </Link>
                          ) : (
                            <span className="block font-semibold">{r.driverId === "DIRECT" ? "Direct visits" : r.driverId}</span>
                          )}
                          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-ink/45">
                            {r.registered ? (
                              <>
                                {r.driverId}
                                {!r.active && <Badge tone="red">Inactive</Badge>}
                              </>
                            ) : r.driverId === "DIRECT" ? (
                              "No driver link"
                            ) : (
                              <Link href={`/admin/drivers?new=${r.driverId}`} className="inline-flex items-center gap-1 font-semibold text-pin hover:underline">
                                <UserPlus className="h-3 w-3" /> Not registered — add
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`${td} text-right`}>{r.registered ? <Badge tone="brand">{r.qualified}</Badge> : <span className="text-ink/25">—</span>}</td>
                    <td className={`${td} text-right font-bold`}>{r.scans}</td>
                    <td className={`${td} text-right text-ink/70`}>{r.androidDownloads}</td>
                    <td className={`${td} text-right text-ink/70`}>{r.iosDownloads}</td>
                    <td className={`${td} whitespace-nowrap text-ink/55`}>{fmt.format(new Date(r.lastActive))}</td>
                    <td className={td}>
                      {r.driverId !== "DIRECT" && (
                        <button
                          onClick={() => setQrDriver(r.driverId)}
                          title={`Show QR for ${r.driverId}`}
                          className={`rounded-lg p-1.5 transition ${qrDriver === r.driverId ? "bg-brand text-ink" : "text-ink/40 hover:bg-ink/5 hover:text-ink"}`}
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </Card>

      <aside id="qr-tool" className="scroll-mt-20 xl:sticky xl:top-8 xl:self-start">
        <QrGenerator
          baseUrl={baseUrl}
          driverId={qrDriver}
          onDriverIdChange={setQrDriver}
          code={drivers[qrDriver.trim().toUpperCase()]?.refCode}
          whatsapp={{ phone: drivers[qrDriver.trim().toUpperCase()]?.phone, name: drivers[qrDriver.trim().toUpperCase()]?.name }}
        />
      </aside>
    </div>
  );
}
