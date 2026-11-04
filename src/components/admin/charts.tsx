// Lightweight SVG charts for the admin overview (server components, no chart library).

const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** Area chart of a daily series with hover read-outs. */
export function AreaChart({ data, label = "scans" }: { data: { day: string; value: number }[]; label?: string }) {
  const W = 600;
  const H = 180;
  const max = Math.max(4, ...data.map((d) => d.value));
  const niceMax = Math.ceil(max / 4) * 4;
  const step = data.length > 1 ? W / (data.length - 1) : W;
  const pts = data.map((d, i) => [i * step, H - (d.value / niceMax) * H] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div>
      <div className="relative">
        {/* Grid + axis labels */}
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
          {[niceMax, (niceMax * 3) / 4, niceMax / 2, niceMax / 4, 0].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <span className="w-6 text-right text-[10px] tabular-nums text-ink/35">{v}</span>
              <div className="h-px flex-1 border-t border-dashed border-ink/[0.08]" />
            </div>
          ))}
        </div>
        <div className="relative ml-8 h-48">
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
            <defs>
              <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#f5b81c" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#f5b81c" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#area-fill)" />
            <path d={line} fill="none" stroke="#d99a07" strokeWidth="2.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          </svg>
          {/* Hover columns */}
          <div className="absolute inset-0 flex">
            {data.map((d, i) => (
              <div key={d.day} className="group relative flex-1">
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink/0 group-hover:bg-ink/15" />
                <div
                  className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-dark opacity-0 shadow group-hover:opacity-100"
                  style={{ top: `${(pts[i][1] / H) * 100}%` }}
                />
                <div
                  className={`pointer-events-none absolute -top-2 z-10 hidden -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg group-hover:block ${
                    i > data.length * 0.7 ? "right-0" : i < data.length * 0.3 ? "left-0" : "left-1/2 -translate-x-1/2"
                  }`}
                >
                  <span className="font-bold">{d.value}</span> {label} · {dayLabel(d.day)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ml-8 mt-2 flex justify-between text-[11px] text-ink/40">
        <span>{data[0] && dayLabel(data[0].day)}</span>
        <span>{total.toLocaleString()} total</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/** Donut with a legend; segments are drawn with stroke-dasharray. */
export function Donut({ segments, centerLabel }: { segments: { label: string; value: number; color: string }[]; centerLabel: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={R} fill="none" stroke="#1f2124" strokeOpacity="0.06" strokeWidth="12" />
          {total > 0 &&
            segments.map((s) => {
              const len = (s.value / total) * C;
              const el = (
                <circle
                  key={s.label}
                  cx="50"
                  cy="50"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="12"
                  strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold tabular-nums">{total.toLocaleString()}</span>
          <span className="text-[11px] font-medium text-ink/50">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-3">
        {segments.map((s) => (
          <li key={s.label} className="text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="font-medium text-ink/80">{s.label}</span>
              <span className="ml-auto font-bold tabular-nums">{s.value.toLocaleString()}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/[0.05]">
              <div className="h-full rounded-full" style={{ width: `${total ? (s.value / total) * 100 : 0}%`, background: s.color }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Step funnel: each bar is relative to the first step, with step-to-step conversion. */
export function Funnel({ steps }: { steps: { label: string; value: number; hint: string }[] }) {
  const top = Math.max(1, steps[0]?.value ?? 1);
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => {
        const prev = steps[i - 1]?.value;
        const rate = i > 0 && prev ? Math.round((s.value / prev) * 100) : null;
        return (
          <li key={s.label}>
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-semibold">{s.label}</span>
              {rate !== null && <span className="text-xs font-semibold text-ink/45">{rate}% of previous</span>}
              <span className="ml-auto text-lg font-extrabold tabular-nums">{s.value.toLocaleString()}</span>
            </div>
            <div className="mt-1.5 h-3 overflow-hidden rounded-full bg-ink/[0.05]">
              <div
                className={`h-full rounded-full ${i === steps.length - 1 ? "bg-emerald-500" : i === 0 ? "bg-ink" : "bg-brand"}`}
                style={{ width: `${Math.max(s.value ? 2 : 0, (s.value / top) * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-ink/45">{s.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
