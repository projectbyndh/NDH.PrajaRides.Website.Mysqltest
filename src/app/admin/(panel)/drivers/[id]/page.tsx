import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  ArrowLeft, Bike, BookOpen, Calendar, CalendarClock, Car, Coins, GraduationCap, Hash, IdCard, Mail, MapPin, MoreHorizontal,
  Phone, PhoneCall, QrCode, ScanLine, ShieldCheck, User, UserCheck, Wallet,
} from "lucide-react";
import { AppleGlyph, PlayGlyph } from "@/components/StoreBadges";
import { Avatar, Badge, Card, CardHeader, ExpiryDate, StatCard } from "@/components/admin/ui";
import { formatDay } from "@/lib/dates";
import { ageFromDob, onboardingStage, PAYOUT_METHODS } from "@/lib/validation";
import { QrGenerator } from "@/components/QrGenerator";
import { getDownloadsByDriver, getDriverMonthActivity } from "@/lib/db";
import { getDriver } from "@/lib/drivers";
import { currentPeriod, periodLabel } from "@/lib/period";
import { lifetimeQualified, listRewards, listTiers, qualifiedCounts } from "@/lib/rewards";
import { requireAdmin } from "@/lib/session";
import { siteUrl } from "@/lib/site";
import { RewardsTable } from "../../rewards/RewardsTable";
import { DeleteDriverButton, EditDriverButton, RegenerateCodeButton, VerifyDriverButton } from "../DriverActions";
import { ResetPinForm } from "../DriverForms";
import { nameSlug } from "@/lib/refcode";

export default function DriverDetailPage(props: PageProps<"/admin/drivers/[id]">) {
  return (
    <Suspense fallback={<div className="h-[600px] animate-pulse rounded-2xl bg-ink/[0.06]" />}>
      <DriverDetail params={props.params} />
    </Suspense>
  );
}

const fullDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kathmandu" });
const Play = ({ className }: { className?: string }) => <PlayGlyph className={className} />;
const Apple = ({ className }: { className?: string }) => <AppleGlyph className={className} />;

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink/[0.04] text-ink/50">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-wider text-ink/40">{label}</dt>
        <dd className="mt-0.5 break-words font-medium text-ink">{children}</dd>
      </div>
    </div>
  );
}

const missing = <span className="font-normal text-ink/35">Not provided</span>;

function InfoGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-ink/[0.06] pt-4 first-of-type:border-0 first-of-type:pt-0 [&+&]:mt-4">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{title}</h3>
      <dl className="grid grid-cols-1 divide-y divide-ink/[0.06] sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">{children}</dl>
    </section>
  );
}

async function DriverDetail({ params }: { params: PageProps<"/admin/drivers/[id]">["params"] }) {
  await connection();
  await requireAdmin();
  const { id } = await params;
  const driver = await getDriver(decodeURIComponent(id).toUpperCase());
  if (!driver) notFound();
  const period = currentPeriod();

  const [month, lifetime, rewards, activity, dlAll, tiers, baseUrl] = await Promise.all([
    qualifiedCounts(period),
    lifetimeQualified(driver.id),
    listRewards({ driverId: driver.id }),
    getDriverMonthActivity(driver.id, period),
    getDownloadsByDriver(null),
    listTiers(true),
    siteUrl(),
  ]);
  const mine = month.get(driver.id) ?? 0;
  const all = dlAll.get(driver.id) ?? { androidDownloads: 0, iosDownloads: 0 };
  const paid = rewards.filter((r) => r.status === "paid").reduce((s, r) => s + r.amountNpr, 0);
  const pending = rewards.filter((r) => r.status === "pending").reduce((s, r) => s + r.amountNpr, 0);
  const next = tiers.find((t) => t.target > mine);
  const VehicleIcon = driver.vehicleType === "bike" ? Bike : driver.vehicleType === "other" ? MoreHorizontal : Car;
  const monthName = periodLabel(period);
  const stage = onboardingStage(driver);
  const firstName = driver.name.split(" ")[0];

  return (
    <>
      <Link href="/admin/drivers" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink/55 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All drivers
      </Link>

      {/* Header */}
      <Card className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-brand via-brand-light/70 to-transparent" />
        <div className="relative flex flex-wrap items-end gap-4 pt-8">
          <span className="rounded-full ring-4 ring-white">
            <Avatar name={driver.name} size="lg" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">{driver.name}</h1>
              <Badge tone="dark">{driver.id}</Badge>
              {driver.active ? <Badge tone="green" dot>Active</Badge> : <Badge tone="red" dot>Inactive</Badge>}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink/60">
              <span className="flex items-center gap-1.5"><Phone className="h-4 w-4 text-ink/35" /> {driver.phone}</span>
              <span className="flex items-center gap-1.5"><VehicleIcon className="h-4 w-4 text-ink/35" /> {driver.vehicleNo ?? "No vehicle number"}</span>
            </div>
          </div>
          <div className="flex w-full gap-2 sm:w-auto [&>*]:flex-1 sm:[&>*]:flex-none">
            <EditDriverButton driver={driver} />
            <DeleteDriverButton driver={driver} backToList />
          </div>
        </div>
      </Card>

      {stage !== "done" && (
        <div className={`flex flex-wrap items-center gap-4 rounded-2xl border p-5 ${stage === "review" ? "border-brand-dark/30 bg-brand-light/50" : "border-amber-200 bg-amber-50"}`}>
          <ShieldCheck className={`h-6 w-6 shrink-0 ${stage === "review" ? "text-ink" : "text-amber-700"}`} />
          <div className="min-w-0 flex-1">
            <p className="font-bold">{stage === "review" ? `${firstName} submitted their details` : `Waiting for ${firstName} to complete their profile`}</p>
            <p className="mt-0.5 text-sm text-ink/65">
              {stage === "review"
                ? "Check their license, vehicle and bluebook below, then verify to unlock their QR code and referral link."
                : "They fill in their documents and vehicle details after logging in. You can also fill them in with Edit and verify straight away."}
            </p>
          </div>
          <VerifyDriverButton driver={driver} />
        </div>
      )}

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          highlight
          label={`Referrals · ${monthName.split(" ")[0]}`}
          value={mine}
          icon={UserCheck}
          sub={next ? `${next.target - mine} more for ${next.reward}` : `${lifetime} all time`}
        />
        <StatCard label="Android downloads" value={activity.androidDownloads} icon={Play} sub={`This month · ${all.androidDownloads} all time`} />
        <StatCard label="iPhone downloads" value={activity.iosDownloads} icon={Apple} sub={`This month · ${all.iosDownloads} all time`} />
        <StatCard label="Rewards paid" value={`Rs ${paid.toLocaleString()}`} icon={Coins} sub={pending ? `Rs ${pending.toLocaleString()} waiting to be paid` : "Nothing pending"} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-6">
          {/* Profile, read-only */}
          <Card>
            <CardHeader title="Driver information" description="Use Edit to change any of these details." action={<EditDriverButton driver={driver} variant="icon" />} className="mb-2" />
            <InfoGroup title="Personal">
              <InfoRow icon={<User className="h-4 w-4" />} label="Full name">{driver.name}</InfoRow>
              <InfoRow icon={<Phone className="h-4 w-4" />} label="Mobile (login)">
                <a href={`tel:${driver.phone}`} className="hover:underline">{driver.phone}</a>
              </InfoRow>
              <InfoRow icon={<Mail className="h-4 w-4" />} label="Email">
                {driver.email ? <a href={`mailto:${driver.email}`} className="hover:underline">{driver.email}</a> : missing}
              </InfoRow>
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Date of birth">
                {driver.dateOfBirth ? `${formatDay(driver.dateOfBirth)} · ${ageFromDob(driver.dateOfBirth)} yrs` : driver.age ? `${driver.age} years` : missing}
              </InfoRow>
              <InfoRow icon={<IdCard className="h-4 w-4" />} label="Citizenship no.">{driver.citizenshipNo ?? missing}</InfoRow>
              <InfoRow icon={<MapPin className="h-4 w-4" />} label="Address">
                {[driver.address, driver.ward ? `Ward ${driver.ward}` : null, driver.municipality, driver.district, driver.province].filter(Boolean).join(", ") || missing}
              </InfoRow>
              <InfoRow icon={<PhoneCall className="h-4 w-4" />} label="Emergency contact">
                {driver.emergencyName || driver.emergencyPhone ? [driver.emergencyName, driver.emergencyPhone].filter(Boolean).join(" · ") : missing}
              </InfoRow>
            </InfoGroup>

            <InfoGroup title="License">
              <InfoRow icon={<IdCard className="h-4 w-4" />} label="License no.">
                {driver.licenseNo ?? missing}
                {driver.licenseCategory && <span className="text-ink/50"> · Category {driver.licenseCategory === "AB" ? "A + B" : driver.licenseCategory}</span>}
              </InfoRow>
              <InfoRow icon={<CalendarClock className="h-4 w-4" />} label="License expiry"><ExpiryDate iso={driver.licenseExpiry} /></InfoRow>
            </InfoGroup>

            <InfoGroup title="Vehicle">
              <InfoRow icon={<VehicleIcon className="h-4 w-4" />} label="Vehicle">
                <span className="capitalize">{driver.vehicleType}</span>
                {[driver.vehicleBrand, driver.vehicleModel, driver.vehicleColor, driver.vehicleYear].some(Boolean) && (
                  <span> · {[driver.vehicleBrand, driver.vehicleModel, driver.vehicleColor, driver.vehicleYear].filter(Boolean).join(" ")}</span>
                )}
              </InfoRow>
              <InfoRow icon={<Hash className="h-4 w-4" />} label="Number plate">{driver.vehicleNo ?? missing}</InfoRow>
              <InfoRow icon={<BookOpen className="h-4 w-4" />} label="Bluebook">
                {driver.bluebookNo ?? missing}
                {driver.bluebookExpiry && (
                  <span className="mt-1 block text-sm">
                    Renewal: <ExpiryDate iso={driver.bluebookExpiry} />
                  </span>
                )}
              </InfoRow>
              <InfoRow icon={<ShieldCheck className="h-4 w-4" />} label="Insurance expiry"><ExpiryDate iso={driver.insuranceExpiry} /></InfoRow>
            </InfoGroup>

            <InfoGroup title="Payouts & onboarding">
              <InfoRow icon={<Wallet className="h-4 w-4" />} label="Reward payouts">
                {driver.payoutMethod
                  ? `${PAYOUT_METHODS.find((m) => m.value === driver.payoutMethod)?.label} · ${driver.payoutAccount ?? ""}${driver.payoutBank ? ` (${driver.payoutBank})` : ""}`
                  : missing}
              </InfoRow>
              <InfoRow icon={<QrCode className="h-4 w-4" />} label="QR sticker given">
                {driver.stickerGivenOn ? formatDay(driver.stickerGivenOn) : <span className="font-normal text-ink/35">Not yet</span>}
              </InfoRow>
              <InfoRow icon={<GraduationCap className="h-4 w-4" />} label="Training">
                {driver.trainingDone ? <Badge tone="green" dot>Completed</Badge> : <Badge tone="amber" dot>Pending</Badge>}
              </InfoRow>
              <InfoRow icon={<Hash className="h-4 w-4" />} label="Driver ID · referral code">
                {driver.id} <span className="font-mono text-ink/50">· {driver.refCode ?? "—"}</span>
              </InfoRow>
              <InfoRow icon={<Calendar className="h-4 w-4" />} label="Joined">{fullDate.format(new Date(driver.createdAt))}</InfoRow>
            </InfoGroup>
            {driver.notes && (
              <div className="mt-4 rounded-xl bg-amber-50/70 p-4 text-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-800/70">Admin notes</p>
                <p className="mt-1 whitespace-pre-line text-ink/80">{driver.notes}</p>
              </div>
            )}
          </Card>

          {/* This month's activity */}
          <Card>
            <CardHeader title={`Activity · ${monthName}`} description="From QR scan to app store, for this driver's link." className="mb-4" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Link opened", value: activity.scans, icon: <ScanLine className="h-4 w-4" /> },
                { label: "Android", value: activity.androidDownloads, icon: <PlayGlyph className="h-4 w-4" /> },
                { label: "iPhone", value: activity.iosDownloads, icon: <AppleGlyph className="h-4 w-4" /> },
                { label: "Qualified", value: mine, icon: <UserCheck className="h-4 w-4 text-emerald-600" /> },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-ink/[0.03] p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-ink/50">
                    {s.icon} {s.label}
                  </div>
                  <div className="mt-1 text-2xl font-extrabold tabular-nums">{s.value}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink/45">
              Android / iPhone = unique phones that tapped that store’s button. Installs happen inside the store and can’t be seen by the website.
            </p>
          </Card>

          <Card flush>
            <div className="p-5 sm:p-6">
              <CardHeader title="Rewards" description="Earned automatically when this driver reaches a monthly target." />
            </div>
            <RewardsTable rows={rewards} showDriver={false} />
          </Card>
        </div>

        <div className="space-y-6">
          <QrGenerator baseUrl={baseUrl} driverId={driver.id} code={driver.refCode} title="QR sticker" whatsapp={{ phone: driver.phone, name: driver.name }} />
          <Card>
            <CardHeader title="Referral link" description="A random code only this driver has, so links can't be guessed or edited." className="mb-3" />
            <p className="break-all rounded-xl bg-ink/[0.04] px-3 py-2.5 font-mono text-sm">
              {baseUrl.replace(/^https?:\/\//, "")}
              {driver.refCode ? (
                <>
                  /ride/{nameSlug(driver.name)}/<b>{driver.refCode}</b>
                </>
              ) : (
                <>
                  /r/<b>{driver.id}</b>
                </>
              )}
            </p>
            <RegenerateCodeButton driverId={driver.id} />
          </Card>
          <Card>
            <CardHeader title="Reset login PIN" description="Also unlocks the account after too many wrong attempts." className="mb-4" />
            <ResetPinForm driverId={driver.id} portalUrl={`${baseUrl}/driver`} />
          </Card>
        </div>
      </div>
    </>
  );
}
