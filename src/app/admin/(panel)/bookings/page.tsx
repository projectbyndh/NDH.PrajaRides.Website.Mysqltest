import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { BarChart3, Bike, CalendarCheck, Car, CheckCheck, Clock, MessageSquare, Phone, Search, XCircle, Zap } from "lucide-react";
import { WhatsAppGlyph } from "@/components/StoreBadges";
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, StatCard } from "@/components/admin/ui";
import { BOOKING_SURVEY, type SurveyKey } from "@/lib/validation";
import { listBookings, type Booking, type BookingStatus } from "@/lib/bookings";
import { requireAdmin } from "@/lib/session";
import { getSiteContent } from "@/lib/site-content";
import { AutoRefresh, BookingActions } from "./BookingActions";

export const metadata = { title: "Bookings · Admin" };

const FILTERS: { value: BookingStatus | "all"; label: string }[] = [
  { value: "new", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

const STATUS_BADGE: Record<BookingStatus, { tone: "amber" | "brand" | "green" | "neutral"; label: string }> = {
  new: { tone: "amber", label: "New" },
  confirmed: { tone: "brand", label: "Confirmed" },
  completed: { tone: "green", label: "Completed" },
  cancelled: { tone: "neutral", label: "Cancelled" },
};

export default function BookingsPage(props: PageProps<"/admin/bookings">) {
  return (
    <Suspense fallback={<div className="h-[480px] animate-pulse rounded-2xl bg-ink/[0.06]" />}>
      <Bookings searchParams={props.searchParams} />
    </Suspense>
  );
}

const minutesSince = (d: Date) => Math.floor((Date.now() - new Date(d).getTime()) / 60_000);
const minutesUntil = (d: Date) => Math.round((new Date(d).getTime() - Date.now()) / 60_000);
const ago = (d: Date) => {
  const m = minutesSince(d);
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.floor(m / 60)}h ago` : `${Math.floor(m / 1440)}d ago`;
};
const rideTime = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kathmandu" });

/** Open bookings: rides wanted now first (longest waiting on top), then scheduled rides by time. */
function byUrgency(a: Booking, b: Booking): number {
  if (!a.rideAt !== !b.rideAt) return a.rideAt ? 1 : -1;
  if (!a.rideAt || !b.rideAt) return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  return new Date(a.rideAt).getTime() - new Date(b.rideAt).getTime();
}

async function Bookings({ searchParams }: { searchParams: PageProps<"/admin/bookings">["searchParams"] }) {
  await connection();
  await requireAdmin();
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f.value === sp.status)?.value ?? "new";
  const query = (typeof sp.q === "string" ? sp.q : "").trim();
  const [all, { company }] = await Promise.all([listBookings(), getSiteContent()]);

  const needle = query.toLowerCase();
  const rows = all.filter(
    (b) => (filter === "all" || b.status === filter) && (!needle || [b.name, b.phone, b.pickup, b.dropoff].some((v) => v.toLowerCase().includes(needle))),
  );
  if (filter === "new" || filter === "confirmed") rows.sort(byUrgency);
  const count = (s: BookingStatus) => all.filter((b) => b.status === s).length;
  const counts: Record<string, number> = { new: count("new"), confirmed: count("confirmed"), completed: count("completed"), cancelled: count("cancelled"), all: all.length };
  const href = (status: string, q = query) => `/admin/bookings?status=${status}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <AutoRefresh />
      <PageHeader title="Ride bookings" description="Ride requests from the website. Call the customer, book the ride in NepCab, then confirm it here. The list updates by itself." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="New requests" value={counts.new} icon={Zap} highlight sub="Call them back now" />
        <StatCard label="Confirmed" value={counts.confirmed} icon={CalendarCheck} sub="Ride booked" />
        <StatCard label="Completed" value={counts.completed} icon={CheckCheck} sub="All time" />
        <StatCard label="Cancelled" value={counts.cancelled} icon={XCircle} sub="All time" />
      </div>

      <Insights bookings={all} />

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
        <form action="/admin/bookings" className="relative sm:w-72">
          <input type="hidden" name="status" value={filter} />
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" aria-hidden />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search name, mobile, place"
            aria-label="Search bookings"
            className="h-10 w-full rounded-xl border border-ink/15 bg-white pl-9 pr-3 text-sm shadow-sm outline-none transition placeholder:text-ink/35 focus:border-brand-dark focus:ring-4 focus:ring-brand/25"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={CalendarCheck} title={query ? `No bookings match “${query}”` : filter === "new" ? "No new requests" : "Nothing here"}>
            {query ? (
              <Link href={href(filter, "")} className="font-semibold text-ink underline-offset-2 hover:underline">
                Clear search
              </Link>
            ) : (
              "Requests from the “Book a ride” card on the NepCab page appear here."
            )}
          </EmptyState>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {rows.map((b) => (
            <BookingCard key={b.id} b={b} company={company.name} />
          ))}
        </div>
      )}
    </>
  );
}

const BAR_TONES: Record<SurveyKey, string[]> = {
  sharePref: ["bg-emerald-500", "bg-amber-400", "bg-ink/30"],
  availability: ["bg-emerald-500", "bg-amber-400", "bg-pin"],
};

/** What riders answered to the optional questions on the booking card, all time and last 7 days. */
function Insights({ bookings }: { bookings: Booking[] }) {
  const week = bookings.filter((b) => minutesSince(b.createdAt) < 7 * 1440);
  return (
    <Card>
      <CardHeader
        title="Rider insights"
        description="Answers to the optional questions on the booking card. Grows with every booking."
        action={<BarChart3 className="h-5 w-5 text-ink/30" />}
        className="mb-5"
      />
      <div className="grid gap-8 lg:grid-cols-2">
        {(Object.keys(BOOKING_SURVEY) as SurveyKey[]).map((key) => {
          const q = BOOKING_SURVEY[key];
          const answered = bookings.filter((b) => b[key]);
          const answeredWeek = week.filter((b) => b[key]);
          return (
            <div key={key}>
              <p className="text-sm font-semibold text-ink">{q.question}</p>
              <p className="mt-0.5 text-xs text-ink/50">
                {answered.length} answer{answered.length === 1 ? "" : "s"} · {answeredWeek.length} in the last 7 days
              </p>
              <ul className="mt-4 space-y-3">
                {q.options.map((o, i) => {
                  const n = answered.filter((b) => b[key] === o.value).length;
                  const nWeek = answeredWeek.filter((b) => b[key] === o.value).length;
                  const pct = answered.length ? Math.round((n / answered.length) * 100) : 0;
                  return (
                    <li key={o.value}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="font-medium text-ink/80">{o.label}</span>
                        <span className="tabular-nums text-ink/55">
                          <b className="text-ink">{pct}%</b> · {n}
                          {answeredWeek.length > 0 && <span className="text-ink/40"> ({nWeek} this week)</span>}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink/[0.06]">
                        <div className={`h-full rounded-full ${BAR_TONES[key][i]}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              {answered.length === 0 && <p className="mt-3 text-xs text-ink/45">No answers yet.</p>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

const answerLabel = (key: SurveyKey, v: string | null) => BOOKING_SURVEY[key].options.find((o) => o.value === v)?.label;

function When({ b }: { b: Booking }) {
  const open = b.status === "new" || b.status === "confirmed";
  if (!b.rideAt) {
    const waiting = minutesSince(b.createdAt);
    return (
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">As soon as possible</span>
        {b.status === "new" && <Badge tone={waiting >= 10 ? "red" : "amber"} dot>Waiting {waiting < 60 ? `${waiting} min` : `${Math.floor(waiting / 60)}h`}</Badge>}
      </span>
    );
  }
  const until = minutesUntil(b.rideAt);
  return (
    <span className="flex flex-wrap items-center gap-2">
      <span className="font-semibold">{rideTime.format(new Date(b.rideAt))}</span>
      {open && until >= 0 && until < 180 && <Badge tone="amber" dot>In {until < 60 ? `${until} min` : `${Math.floor(until / 60)}h ${until % 60}m`}</Badge>}
      {open && until < 0 && <Badge tone="red" dot>Time passed</Badge>}
    </span>
  );
}

function BookingCard({ b, company }: { b: Booking; company: string }) {
  const first = b.name.split(" ")[0];
  const message = `Namaste ${first}, this is the ${company} booking desk about your NepCab ride from ${b.pickup} to ${b.dropoff}.`;
  const VehicleIcon = b.vehicleType === "bike" ? Bike : Car;
  const status = STATUS_BADGE[b.status];
  return (
    <Card flush className={`flex flex-col ${b.status === "cancelled" ? "opacity-70" : ""}`}>
      <div className="flex items-start gap-3.5 p-5 sm:p-6">
        <Avatar name={b.name} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="truncate text-base font-bold leading-tight">{b.name}</h3>
            <Badge tone={status.tone} dot>{status.label}</Badge>
          </div>
          <p className="mt-0.5 text-xs text-ink/50">Requested {ago(b.createdAt)}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <a href={`tel:${b.phone}`} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-2.5 py-1.5 text-sm font-semibold tabular-nums shadow-sm transition hover:bg-ink/[0.03]">
            <Phone className="h-3.5 w-3.5 text-ink/50" /> {b.phone}
          </a>
          <a
            href={`https://wa.me/977${b.phone}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="WhatsApp"
            aria-label={`WhatsApp ${b.name}`}
            className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-800 ring-1 ring-inset ring-emerald-600/15 transition hover:bg-emerald-100"
          >
            <WhatsAppGlyph className="h-4 w-4" />
          </a>
        </div>
      </div>

      <div className="mx-5 rounded-xl bg-ink/[0.025] p-4 sm:mx-6">
        <div className="relative space-y-3 pl-6">
          <span className="absolute bottom-2 left-[5px] top-2 border-l-2 border-dotted border-ink/20" aria-hidden />
          <p className="relative text-sm">
            <span className="absolute -left-6 top-1 h-3 w-3 rounded-full border-[3px] border-emerald-500 bg-white" aria-hidden />
            <span className="block text-[11px] font-bold uppercase tracking-wider text-ink/40">Pickup</span>
            <span className="font-semibold text-ink">{b.pickup}</span>
          </p>
          <p className="relative text-sm">
            <span className="absolute -left-6 top-1 h-3 w-3 rounded-sm bg-ink" aria-hidden />
            <span className="block text-[11px] font-bold uppercase tracking-wider text-ink/40">Drop-off</span>
            <span className="font-semibold text-ink">{b.dropoff}</span>
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-ink/[0.07] pt-3 text-sm text-ink/75">
          <span className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-ink/40" /> <When b={b} />
          </span>
          <span className="flex items-center gap-1.5">
            <VehicleIcon className="h-4 w-4 text-ink/40" /> {b.vehicleType === "bike" ? "Bike" : "Car"}
          </span>
        </div>
      </div>

      {(b.sharePref || b.availability) && (
        <div className="mx-5 mt-3 flex flex-wrap gap-1.5 text-xs sm:mx-6">
          {b.sharePref && <Badge>Would share: {answerLabel("sharePref", b.sharePref)}</Badge>}
          {b.availability && <Badge>Finding rides: {answerLabel("availability", b.availability)}</Badge>}
        </div>
      )}

      {b.note && (
        <div className="mx-5 mt-3 flex gap-2.5 rounded-xl border border-ink/[0.08] px-4 py-3 text-sm sm:mx-6">
          <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-ink/35" />
          <p className="italic text-ink/70">“{b.note}”</p>
        </div>
      )}

      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/[0.07] bg-ink/[0.015] px-5 py-3.5 sm:px-6">
          <span className="text-xs text-ink/50">{b.updatedAt && b.status !== "new" ? `${status.label} ${ago(b.updatedAt)}` : "Call to confirm the driver and fare"}</span>
          <BookingActions id={b.id} status={b.status} />
        </div>
      </div>
    </Card>
  );
}
