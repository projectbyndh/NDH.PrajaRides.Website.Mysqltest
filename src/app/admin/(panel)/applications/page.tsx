import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { ArrowRight, CalendarPlus, ClipboardList, Clock, ExternalLink, ImageIcon, MessageSquare, Phone, Search, UserCheck, UserX } from "lucide-react";
import { WhatsAppGlyph } from "@/components/StoreBadges";
import { Avatar, Badge, btn, Card, EmptyState, PageHeader, StatCard } from "@/components/admin/ui";
import { listApplicationPhotos, listApplications, type Application, type ApplicationPhoto, type ApplicationStatus } from "@/lib/applications";
import { expiryState, formatDay } from "@/lib/dates";
import { listDrivers, nextDriverId } from "@/lib/drivers";
import { requireAdmin } from "@/lib/session";
import { siteUrl } from "@/lib/site";
import { ageFromDob, AVAILABILITY_OPTIONS, onboardingStage, OWNERSHIP_OPTIONS, type OnboardingStage } from "@/lib/validation";
import { ApproveButton, RejectButton, ReopenButton } from "./ApplicationActions";

export const metadata = { title: "Applications · Admin" };

const FILTERS: { value: ApplicationStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export default function ApplicationsPage(props: PageProps<"/admin/applications">) {
  return (
    <Suspense fallback={<div className="h-[480px] animate-pulse rounded-2xl bg-ink/[0.06]" />}>
      <Applications searchParams={props.searchParams} />
    </Suspense>
  );
}

const ago = (d: Date) => {
  const h = Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000);
  return h < 1 ? "just now" : h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

const inLastWeek = (d: Date) => Date.now() - new Date(d).getTime() < 7 * 86_400_000;

const appliedOn = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kathmandu" });

async function Applications({ searchParams }: { searchParams: PageProps<"/admin/applications">["searchParams"] }) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.value === sp.status)?.value ?? "pending";
  const query = (typeof sp.q === "string" ? sp.q : "").trim();
  const [all, nextId, baseUrl, drivers] = await Promise.all([listApplications(), nextDriverId(), siteUrl(), listDrivers()]);

  const needle = query.toLowerCase();
  const rows = all.filter(
    (a) =>
      (filter === "all" || a.status === filter) &&
      (!needle || [a.name, a.phone, a.address, a.municipality, a.district].some((v) => v?.toLowerCase().includes(needle))),
  );
  const photos = await listApplicationPhotos(rows.map((r) => r.id));
  const stages = new Map(drivers.map((d) => [d.id, onboardingStage(d)]));
  const count = (s: ApplicationStatus) => all.filter((a) => a.status === s).length;
  const counts: Record<string, number> = { pending: count("pending"), approved: count("approved"), rejected: count("rejected"), all: all.length };
  const thisWeek = all.filter((a) => inLastWeek(a.createdAt)).length;
  const href = (status: string, q = query) => `/admin/applications?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader title="Driver applications" description="People who applied on the website to drive with Praja Ride. Call them, check their license and vehicle, then approve or reject." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Waiting for review" value={counts.pending} icon={Clock} highlight sub="Call them to verify" />
        <StatCard label="Approved" value={counts.approved} icon={UserCheck} sub="Created as drivers" />
        <StatCard label="Rejected" value={counts.rejected} icon={UserX} sub="Can be reopened" />
        <StatCard label="New this week" value={thisWeek} icon={CalendarPlus} sub="Last 7 days" />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-sm ring-1 ring-ink/[0.08] sm:w-fit" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={href(f.value)}
              aria-current={filter === f.value ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${filter === f.value ? "bg-ink text-white" : "text-ink/55 hover:bg-ink/[0.04] hover:text-ink"}`}
            >
              {f.label}
              <span className={`ml-1.5 tabular-nums ${filter === f.value ? "text-white/60" : "text-ink/35"}`}>{counts[f.value]}</span>
            </Link>
          ))}
        </nav>
        <form action="/admin/applications" className="relative sm:w-72">
          <input type="hidden" name="status" value={filter} />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search name, mobile, address"
            aria-label="Search applications"
            className="h-10 w-full rounded-xl border border-ink/15 bg-white pl-9 pr-3 text-sm shadow-sm outline-none transition placeholder:text-ink/35 focus:border-brand-dark focus:ring-4 focus:ring-brand/25"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={ClipboardList} title={query ? `No applications match “${query}”` : filter === "pending" ? "You're all caught up" : "Nothing here"}>
            {query ? (
              <Link href={href(filter, "")} className="font-semibold text-ink underline-offset-2 hover:underline">
                Clear search
              </Link>
            ) : (
              "New applications from the “Drive with us” page appear here."
            )}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {rows.map((a) => (
            <ApplicationCard
              key={a.id}
              a={a}
              photos={photos.filter((p) => p.applicationId === a.id)}
              nextId={nextId}
              portalUrl={`${baseUrl}/driver`}
              stage={a.driverId ? stages.get(a.driverId) : undefined}
            />
          ))}
        </div>
      )}
    </>
  );
}

function Detail({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-ink/40">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

const PHOTO_LABEL: Record<ApplicationPhoto["kind"], string> = { license: "License", vehicle: "Vehicle", bluebook: "Bluebook" };
const PHOTO_ORDER: Record<ApplicationPhoto["kind"], number> = { license: 0, bluebook: 1, vehicle: 2 };

function ApplicationCard({
  a,
  photos,
  nextId,
  portalUrl,
  stage,
}: {
  a: Application;
  photos: ApplicationPhoto[];
  nextId: string;
  portalUrl: string;
  /** For approved applications: the driver's sign-up progress (undefined if the driver was removed). */
  stage?: OnboardingStage;
}) {
  const initial: Record<string, string> = Object.fromEntries(
    Object.entries({
      name: a.name, phone: a.phone, email: a.email, address: a.address, dateOfBirth: a.dateOfBirth, province: "Lumbini", district: a.district,
      municipality: a.municipality, ward: a.ward, vehicleType: a.vehicleType, vehicleNo: a.vehicleNo, vehicleBrand: a.vehicleBrand,
      licenseNo: a.licenseNo, licenseCategory: a.licenseCategory, licenseExpiry: a.licenseExpiry,
      citizenshipNo: a.citizenshipNo, emergencyName: a.emergencyName, emergencyPhone: a.emergencyPhone,
      vehicleModel: a.vehicleModel, vehicleColor: a.vehicleColor, vehicleYear: a.vehicleYear,
      bluebookNo: a.bluebookNo, insuranceExpiry: a.insuranceExpiry,
    }).map(([k, v]) => [k, v == null ? "" : String(v)]),
  );
  const licenseState = a.licenseExpiry ? expiryState(a.licenseExpiry) : null;
  const address = a.address || [a.ward ? `Ward ${a.ward}` : null, a.municipality, a.district].filter(Boolean).join(", ");
  const vehicle = [a.vehicleBrand, a.vehicleModel, a.vehicleColor, a.vehicleYear].filter(Boolean).join(" ");
  const sortedPhotos = [...photos].sort((x, y) => PHOTO_ORDER[x.kind] - PHOTO_ORDER[y.kind]);

  return (
    <Card flush className="flex flex-col">
      <div className="flex items-start gap-3.5 p-5 sm:p-6">
        <Avatar name={a.name} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="truncate text-lg font-bold leading-tight">{a.name}</h3>
            {a.status === "pending" ? <Badge tone="amber" dot>Pending</Badge> : a.status === "approved" ? <Badge tone="green" dot>Approved</Badge> : <Badge tone="red" dot>Rejected</Badge>}
          </div>
          <p className="mt-1 text-xs text-ink/50">
            Applied {appliedOn.format(new Date(a.createdAt))} · {ago(a.createdAt)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-sm font-semibold tabular-nums shadow-sm transition hover:bg-ink/[0.03]">
              <Phone className="h-3.5 w-3.5 text-ink/50" /> {a.phone}
            </a>
            <a
              href={`https://wa.me/977${a.phone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15 transition hover:bg-emerald-100"
            >
              <WhatsAppGlyph className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      </div>

      <dl className="mx-5 grid grid-cols-1 gap-x-6 gap-y-3.5 rounded-xl bg-ink/[0.025] p-4 sm:mx-6 sm:grid-cols-2">
        <Detail label="Address" wide>{address || <span className="text-ink/35">Not given</span>}</Detail>
        {a.email && <Detail label="Email">{a.email}</Detail>}
        {a.dateOfBirth && (
          <Detail label="Date of birth">
            {formatDay(a.dateOfBirth)} <span className="text-ink/50">· {ageFromDob(a.dateOfBirth)} yrs</span>
          </Detail>
        )}
        {a.citizenshipNo && <Detail label="Citizenship no.">{a.citizenshipNo}</Detail>}
        {(a.vehicleNo || vehicle) && (
          <Detail label="Vehicle">
            <span className="capitalize">{a.vehicleType}</span>
            {vehicle && ` · ${vehicle}`}
            {a.vehicleNo && <span className="font-semibold"> · {a.vehicleNo}</span>}
          </Detail>
        )}
        {a.licenseNo && (
          <Detail label="License">
            {a.licenseNo}
            {a.licenseCategory && ` · Cat. ${a.licenseCategory === "AB" ? "A + B" : a.licenseCategory}`}
            {a.licenseExpiry && (
              <span className={licenseState === "expired" ? "font-semibold text-pin" : licenseState === "soon" ? "font-semibold text-amber-700" : "text-ink/60"}>
                {" "}· expires {formatDay(a.licenseExpiry)}
              </span>
            )}
          </Detail>
        )}
        {(a.bluebookNo || a.insuranceExpiry || a.ownership) && (
          <Detail label="Bluebook">
            {[a.bluebookNo, a.insuranceExpiry && `insured until ${formatDay(a.insuranceExpiry)}`, a.ownership && OWNERSHIP_OPTIONS.find((o) => o.value === a.ownership)?.label]
              .filter(Boolean)
              .join(" · ")}
          </Detail>
        )}
        {a.availability && <Detail label="Availability">{AVAILABILITY_OPTIONS.find((o) => o.value === a.availability)?.label}</Detail>}
        {(a.emergencyName || a.emergencyPhone) && <Detail label="Emergency contact">{[a.emergencyName, a.emergencyPhone].filter(Boolean).join(" · ")}</Detail>}
      </dl>

      {a.message && (
        <div className="mx-5 mt-3 flex gap-2.5 rounded-xl border border-ink/[0.08] px-4 py-3 text-sm sm:mx-6">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-ink/35" />
          <p className="italic text-ink/70">“{a.message}”</p>
        </div>
      )}

      <div className="px-5 pt-5 sm:px-6">
        <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-ink/40">
          <ImageIcon className="h-3.5 w-3.5" /> Photos <span className="font-semibold text-ink/30">{photos.length}</span>
        </p>
        {sortedPhotos.length ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {sortedPhotos.map((p) => (
              <li key={p.id}>
                <a
                  href={`/admin/applications/photo/${p.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-ink/5 ring-1 ring-ink/10"
                  title={`Open ${PHOTO_LABEL[p.kind].toLowerCase()} photo`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/admin/applications/photo/${p.id}?s=thumb`} alt={PHOTO_LABEL[p.kind]} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 text-[11px] font-semibold text-white">{PHOTO_LABEL[p.kind]}</span>
                  <ExternalLink className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-white opacity-0 drop-shadow transition group-hover:opacity-100" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-ink/15 px-4 py-3 text-sm text-ink/45">No photos sent.</p>
        )}
      </div>

      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/[0.07] bg-ink/[0.015] px-5 py-4 sm:px-6">
          <div className="min-w-0 text-sm text-ink/60">
            {a.status === "approved" && a.driverId ? (
              <span className="flex flex-wrap items-center gap-2">
                Driver
                <Link href={`/admin/drivers/${a.driverId}`} className="font-bold text-ink hover:underline">
                  {a.driverId}
                </Link>
                {stage === "done" && <Badge tone="green">Verified</Badge>}
                {stage === "review" && <Badge tone="brand">Details submitted</Badge>}
                {stage === "details" && <Badge tone="amber">Waiting for driver&apos;s details</Badge>}
                {stage === undefined && <Badge>Driver removed</Badge>}
              </span>
            ) : a.status === "rejected" ? (
              <span>Rejected{a.reviewNote ? `: ${a.reviewNote}` : ""}</span>
            ) : (
              <span>Call to verify, then decide.</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {a.status === "pending" ? (
              <>
                <RejectButton applicationId={a.id} name={a.name} />
                <ApproveButton applicationId={a.id} name={a.name} initial={initial} nextId={nextId} portalUrl={portalUrl} />
              </>
            ) : a.status === "rejected" ? (
              <ReopenButton applicationId={a.id} />
            ) : stage === "review" && a.driverId ? (
              <Link href={`/admin/drivers/${a.driverId}`} className={btn.primary}>
                Review &amp; verify <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
