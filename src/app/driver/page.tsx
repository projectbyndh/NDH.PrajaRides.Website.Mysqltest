import { Suspense } from "react";
import { connection } from "next/server";
import { AlertTriangle, Bike, BookOpen, Car, CheckCircle2, Clock, FileCheck2, Gift, IdCard, Lock, LogOut, Medal, ScanLine, ShieldCheck, Trophy, Users, Wallet } from "lucide-react";
import { SubmitButton } from "@/components/SubmitButton";
import { LogoMark } from "@/components/Logo";
import { getIdentity } from "@/lib/identity";
import { AppleGlyph, PlayGlyph } from "@/components/StoreBadges";
import { QrGenerator } from "@/components/QrGenerator";
import { getDriverMonthActivity } from "@/lib/db";
import { listDrivers, type Driver } from "@/lib/drivers";
import { expiryState, expiryText } from "@/lib/dates";
import { onboardingStage, PAYOUT_METHODS } from "@/lib/validation";
import { currentPeriod, daysLeft, periodLabel } from "@/lib/period";
import { dailyQualified, lifetimeQualified, listRewards, listTiers, qualifiedCounts, syncRewards } from "@/lib/rewards";
import { requireDriver } from "@/lib/session";
import { siteUrl } from "@/lib/site";
import { driverLogoutAction } from "./actions";
import { ProfileForm } from "./ProfileForm";

export const metadata = { title: "My referrals" };

const PlayIcon = ({ className }: { className?: string }) => <PlayGlyph className={className} />;
const AppleIcon = ({ className }: { className?: string }) => <AppleGlyph className={className} />;

export default function DriverPage() {
  return (
    <main className="flex-1 bg-[#f6f5f0]">
      <Suspense fallback={<PortalSkeleton />}>
        <Portal />
      </Suspense>
    </main>
  );
}

async function Portal() {
  await connection();
  const driver = await requireDriver();
  const stage = onboardingStage(driver);
  if (stage !== "done") return <CompleteProfile driver={driver} reviewing={stage === "review"} />;
  const period = currentPeriod();

  await syncRewards();
  const who = await getIdentity();
  const [counts, drivers, tiers, lifetime, daily, rewards, activity, baseUrl] = await Promise.all([
    qualifiedCounts(period),
    listDrivers(),
    listTiers(true),
    lifetimeQualified(driver.id),
    dailyQualified(driver.id, 14),
    listRewards({ driverId: driver.id }),
    getDriverMonthActivity(driver.id, period),
    siteUrl(),
  ]);

  const mine = counts.get(driver.id) ?? 0;
  const activeDrivers = drivers.filter((d) => d.active).length;
  const rank = 1 + [...counts.values()].filter((n) => n > mine).length;
  const next = tiers.find((t) => t.target > mine);
  const prevTarget = [...tiers].reverse().find((t) => t.target <= mine)?.target ?? 0;
  const progress = next ? ((mine - prevTarget) / (next.target - prevTarget)) * 100 : 100;
  const earnedThisMonth = rewards.filter((r) => r.period === period && r.status !== "cancelled");
  const totalPaid = rewards.filter((r) => r.status === "paid").reduce((s, r) => s + r.amountNpr, 0);
  const firstName = driver.name.split(" ")[0];
  const left = daysLeft(period);

  return (
    <>
      <div className="bg-navy px-5 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
        {who.company} · NepCab driver portal
      </div>
      <header className="bg-brand px-5 pb-24 pt-5">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <LogoMark className="h-11 w-11" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-lg font-extrabold">Hi, {firstName}</p>
            <p className="flex items-center gap-1 text-sm text-ink/70">
              {driver.vehicleType === "bike" ? <Bike className="h-3.5 w-3.5" /> : <Car className="h-3.5 w-3.5" />}
              {driver.id}
              {driver.vehicleNo && ` · ${driver.vehicleNo}`}
            </p>
          </div>
          <form action={driverLogoutAction} className="ml-auto">
            <SubmitButton spinner={false} className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/40">
              <LogOut className="h-4 w-4" /> Log out
            </SubmitButton>
          </form>
        </div>
      </header>

      <div className="mx-auto -mt-20 max-w-lg space-y-4 px-4 pb-10">
        {/* This month */}
        <section className="rounded-3xl bg-ink p-6 text-white shadow-xl">
          <div className="flex items-center justify-between text-sm text-white/70">
            <span>{periodLabel(period)}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {left} {left === 1 ? "day" : "days"} left
            </span>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-6xl font-extrabold tabular-nums leading-none text-brand">{mine}</span>
            <span className="pb-1 text-lg font-semibold leading-tight">
              referrals
              <br />
              <span className="text-sm font-normal text-white/60">this month</span>
            </span>
            {mine > 0 && (
              <span className="ml-auto flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">
                <Medal className="h-4 w-4 text-brand" /> #{rank} of {activeDrivers}
              </span>
            )}
          </div>

          {next ? (
            <>
              <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${Math.max(3, progress)}%` }} />
              </div>
              <p className="mt-2 text-sm">
                <b className="text-brand">{next.target - mine} more</b> to unlock <b>{next.reward}</b>
              </p>
            </>
          ) : tiers.length > 0 ? (
            <p className="mt-5 flex items-center gap-2 rounded-2xl bg-brand px-4 py-3 font-semibold text-ink">
              <Trophy className="h-5 w-5" /> You reached every reward this month. Amazing work!
            </p>
          ) : null}
        </section>

        {/* Reward ladder */}
        {tiers.length > 0 && (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <Gift className="h-5 w-5" /> This month&apos;s rewards
            </h2>
            <ol className="space-y-2">
              {tiers.map((t) => {
                const reached = mine >= t.target;
                const reward = earnedThisMonth.find((r) => r.target === t.target && r.reward === t.reward);
                return (
                  <li
                    key={t.id}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${reached ? "bg-emerald-50" : "bg-ink/[0.03]"}`}
                  >
                    {reached ? <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-600" /> : <Lock className="h-5 w-5 shrink-0 text-ink/35" />}
                    <div className="min-w-0 flex-1">
                      <p className={`font-semibold ${reached ? "" : "text-ink/70"}`}>{t.reward}</p>
                      <p className="text-xs text-ink/55">{t.target} referrals</p>
                    </div>
                    {reached && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          reward?.status === "paid" ? "bg-emerald-600 text-white" : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {reward?.status === "paid" ? "Paid" : "Earned"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Funnel */}
        <section className="grid grid-cols-2 gap-2">
          {[
            { icon: ScanLine, value: activity.scans, label: "opened your link" },
            { icon: PlayIcon, value: activity.androidDownloads, label: "Android downloads" },
            { icon: AppleIcon, value: activity.iosDownloads, label: "iPhone downloads" },
            { icon: Users, value: lifetime, label: "referrals all time" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="rounded-2xl bg-white p-3 text-center shadow-sm">
              <Icon className="mx-auto h-4 w-4 text-ink/45" />
              <div className="mt-1 text-xl font-extrabold tabular-nums">{value}</div>
              <div className="text-[11px] leading-tight text-ink/55">{label}</div>
            </div>
          ))}
        </section>

        {/* Last 14 days */}
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Last 14 days</h2>
          <div className="mt-4 flex h-24 items-end gap-1">
            {daily.map((d) => {
              const max = Math.max(1, ...daily.map((x) => x.n));
              return (
                <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.n}`}>
                  {d.n > 0 && <span className="mb-0.5 text-center text-[10px] font-semibold text-ink/60">{d.n}</span>}
                  <div className="rounded-t bg-brand" style={{ height: `${Math.max(3, (d.n / max) * 80)}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[11px] text-ink/45">
            <span>2 weeks ago</span>
            <span>Today</span>
          </div>
        </section>

        <QrGenerator baseUrl={baseUrl} driverId={driver.id} code={driver.refCode} name={driver.name} title="My QR code" shareable />

        <MyDocuments driver={driver} phone={who.phone} />

        {/* Reward history */}
        {rewards.length > 0 && (
          <section className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-bold">Reward history</h2>
              <span className="text-sm text-ink/60">
                Paid so far: <b className="text-ink">Rs {totalPaid.toLocaleString()}</b>
              </span>
            </div>
            <ul className="divide-y divide-ink/5 text-sm">
              {rewards.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${r.status === "cancelled" ? "text-ink/40 line-through" : ""}`}>{r.reward}</p>
                    <p className="text-xs text-ink/55">{periodLabel(r.period)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      r.status === "paid"
                        ? "bg-emerald-100 text-emerald-800"
                        : r.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-ink/10 text-ink/50"
                    }`}
                  >
                    {r.status === "pending" ? "Being processed" : r.status === "paid" ? "Paid" : "Cancelled"}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-3xl border border-ink/10 p-5 text-sm text-ink/75">
          <h2 className="mb-2 font-bold text-ink">How referrals count</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>A rider scans your QR (or opens your link) and taps <b>Google Play</b> or <b>App Store</b>.</li>
            <li>Each rider&apos;s phone counts once, for the first driver who referred it.</li>
            <li>Scanning your own QR from your own phone does not count.</li>
            <li>Counts reset on the 1st of every month. Rewards are paid by the NepCab office.</li>
          </ul>
        </section>

        <p className="pt-2 text-center text-xs text-ink/50">
          NepCab {who.city} · By {who.company}
        </p>
      </div>
    </>
  );
}

function PortalSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-40 bg-brand" />
      <div className="mx-auto -mt-20 max-w-lg space-y-4 px-4">
        <div className="h-48 rounded-3xl bg-ink/80" />
        <div className="h-56 rounded-3xl bg-ink/5" />
      </div>
    </div>
  );
}

/** The driver's own document dates, so they renew in time; plus where rewards are paid. */
function MyDocuments({ driver, phone }: { driver: Driver; phone: string }) {
  const docs = [
    { label: "Driving license", icon: IdCard, date: driver.licenseExpiry },
    { label: "Vehicle insurance", icon: ShieldCheck, date: driver.insuranceExpiry },
    { label: "Bluebook renewal", icon: BookOpen, date: driver.bluebookExpiry },
  ];
  const payout = PAYOUT_METHODS.find((m) => m.value === driver.payoutMethod)?.label;
  const masked = driver.payoutAccount ? `••••${driver.payoutAccount.replace(/\D/g, "").slice(-4)}` : "";
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 flex items-center gap-2 font-bold">
        <FileCheck2 className="h-5 w-5" /> My documents
      </h2>
      <ul className="space-y-2">
        {docs.map(({ label, icon: Icon, date }) => {
          const state = date ? expiryState(date) : null;
          return (
            <li key={label} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${state === "expired" ? "bg-pin/[0.07]" : state === "soon" ? "bg-amber-50" : "bg-ink/[0.03]"}`}>
              <Icon className="h-5 w-5 shrink-0 text-ink/45" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{label}</p>
                <p className={`text-xs ${state === "expired" ? "font-semibold text-pin" : state === "soon" ? "font-semibold text-amber-800" : "text-ink/55"}`}>
                  {date ? expiryText(date) : "Not on file. Please share it with the office"}
                </p>
              </div>
              {state === "ok" && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
              {(state === "expired" || state === "soon") && <AlertTriangle className={`h-5 w-5 ${state === "expired" ? "text-pin" : "text-amber-600"}`} />}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-ink/[0.03] px-4 py-3">
        <Wallet className="h-5 w-5 shrink-0 text-ink/45" />
        <div className="text-sm">
          <p className="font-semibold">Rewards paid to</p>
          <p className="text-xs text-ink/55">{payout ? `${payout} ${masked}` : "Not set. Tell the office your eSewa, Khalti or bank details"}</p>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-ink/50">
        Details wrong or renewed a document? Call the office: <a href={`tel:${phone}`} className="font-semibold text-ink">{phone}</a>
      </p>
    </section>
  );
}

/**
 * Step 2 of signing up: approved drivers add their details, then wait for the office to verify
 * them (they can still correct them meanwhile) before the portal opens.
 */
async function CompleteProfile({ driver, reviewing }: { driver: Driver; reviewing: boolean }) {
  const who = await getIdentity();
  return (
    <>
      <div className="bg-navy px-5 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
        {who.company} · NepCab driver portal
      </div>
      <header className="bg-brand px-5 pb-24 pt-5">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <LogoMark className="h-11 w-11" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-lg font-extrabold">Welcome, {driver.name.split(" ")[0]}</p>
            <p className="text-sm text-ink/70">{reviewing ? "Details under review" : "You're approved"} · {driver.id}</p>
          </div>
          <form action={driverLogoutAction} className="ml-auto">
            <SubmitButton spinner={false} className="flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-white/40">
              <LogOut className="h-4 w-4" /> Log out
            </SubmitButton>
          </form>
        </div>
      </header>
      <div className="mx-auto -mt-20 max-w-2xl px-4 pb-10">
        {reviewing ? (
          <section className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
              <Clock className="h-4 w-4" /> Under review
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">Thanks, we&apos;re checking your details</h1>
            <p className="mt-1 text-[15px] text-ink/65">
              Our office will check your license and vehicle details, usually within one working day. Once verified, your QR code, referral link and rewards appear here.
            </p>
            <details className="group mt-6 rounded-2xl border border-ink/10">
              <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                Need to correct something? <span className="font-normal text-ink/55">Edit your details</span>
              </summary>
              <div className="border-t border-ink/10 p-4 sm:p-5">
                <ProfileForm driver={driver} />
              </div>
            </details>
          </section>
        ) : (
          <section className="rounded-3xl bg-white p-6 shadow-xl sm:p-8">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" /> Step 2 of 2
            </p>
            <h1 className="mt-1 text-2xl font-extrabold">Complete your profile</h1>
            <p className="mt-1 text-[15px] text-ink/65">
              Add your documents and vehicle details. Our office checks them, then your QR code, referral link and rewards appear here.
            </p>
            <div className="mt-6">
              <ProfileForm driver={driver} />
            </div>
          </section>
        )}
      </div>
    </>
  );
}
