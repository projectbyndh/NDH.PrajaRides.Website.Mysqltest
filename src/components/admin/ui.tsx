import type { ComponentType, ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { expiryState, expiryText, formatDay } from "@/lib/dates";

// Shared building blocks for the admin panel (server-safe: no hooks).

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  brand:
    "inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-ink shadow-sm transition hover:bg-brand-dark/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-ink/[0.03] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink/70 transition hover:bg-ink/5 hover:text-ink disabled:pointer-events-none disabled:opacity-50",
};

export function Card({ children, className = "", flush = false }: { children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`rounded-2xl border border-ink/[0.08] bg-white shadow-[0_1px_2px_rgba(31,33,36,0.04)] ${flush ? "overflow-hidden" : "p-5 sm:p-6"} ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({ title, description, action, className = "" }: { title: string; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-start gap-3 ${className}`}>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink/55">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink/55">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

const TONES = {
  neutral: "bg-ink/[0.06] text-ink/70",
  green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20",
  red: "bg-pin/[0.07] text-pin ring-1 ring-inset ring-pin/20",
  dark: "bg-ink text-white",
  brand: "bg-brand-light text-ink ring-1 ring-inset ring-brand-dark/25",
} as const;

export function Badge({ children, tone = "neutral", dot = false }: { children: ReactNode; tone?: keyof typeof TONES; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

const AVATAR_COLORS = ["bg-amber-100 text-amber-900", "bg-emerald-100 text-emerald-900", "bg-sky-100 text-sky-900", "bg-rose-100 text-rose-900", "bg-violet-100 text-violet-900", "bg-orange-100 text-orange-900"];

export function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  const color = AVATAR_COLORS[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  const dims = size === "sm" ? "h-8 w-8 text-xs" : size === "lg" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${dims} ${color}`}>{initials}</span>;
}

/** Percentage change, or null when there's no baseline to compare with. */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return null; // nothing to compare with
  return Math.round(((current - previous) / previous) * 100);
}

export function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  delta,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon: ComponentType<{ className?: string }>;
  sub?: ReactNode;
  delta?: number | null;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 ${
        highlight ? "bg-ink text-white shadow-lg shadow-ink/20" : "border border-ink/[0.08] bg-white shadow-[0_1px_2px_rgba(31,33,36,0.04)]"
      }`}
    >
      {highlight && <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-brand/25 blur-2xl" />}
      <div className="flex items-center gap-2 sm:gap-3">
        <span className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl sm:h-9 sm:w-9 ${highlight ? "bg-brand text-ink" : "bg-brand-light/70 text-ink"}`}>
          <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
        </span>
        <span className={`min-w-0 text-xs font-medium leading-tight sm:text-sm ${highlight ? "text-white/70" : "text-ink/60"}`}>{label}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-x-2 sm:mt-4">
        <span className="text-2xl font-extrabold tabular-nums tracking-tight sm:text-3xl">{typeof value === "number" ? value.toLocaleString() : value}</span>
        {delta !== undefined && delta !== null && (
          <span
            className={`mb-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-bold ${
              delta >= 0 ? (highlight ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-50 text-emerald-700") : highlight ? "bg-rose-400/15 text-rose-300" : "bg-rose-50 text-rose-700"
            }`}
          >
            {delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      {sub && <div className={`mt-1 text-[11px] leading-snug sm:text-xs ${highlight ? "text-white/55" : "text-ink/50"}`}>{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children }: { icon: ComponentType<{ className?: string }>; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light/60">
        <Icon className="h-6 w-6 text-ink/70" />
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-ink/55">{children}</div>}
    </div>
  );
}

export const th = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink/45 first:pl-5 sm:first:pl-6";
export const td = "px-4 py-3.5 first:pl-5 sm:first:pl-6";

/** Date of a document with a coloured state: expired (red), within 30 days (amber), fine. */
export function ExpiryDate({ iso }: { iso: string | null }) {
  if (!iso) return <span className="font-normal text-ink/35">Not provided</span>;
  const state = expiryState(iso);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {formatDay(iso)}
      {state !== "ok" && <Badge tone={state === "expired" ? "red" : "amber"} dot>{expiryText(iso)}</Badge>}
    </span>
  );
}
