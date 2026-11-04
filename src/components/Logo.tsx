type Props = { className?: string; title?: string };

/** NepCab mark: "NC" in a ring with the red map pin, drawn as SVG so it stays sharp on stickers. */
export function LogoMark({ className, title = "NepCab" }: Props) {
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={title}>
      <circle cx="64" cy="64" r="48" fill="#fff" />
      <circle cx="64" cy="64" r="48" fill="none" stroke="#1f2124" strokeWidth="7" />
      <circle cx="64" cy="64" r="39" fill="none" stroke="#1f2124" strokeWidth="2" />
      <text x="64" y="72" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="800" fontSize="34" fill="#1f2124" letterSpacing="-1">
        NC
      </text>
      <text x="64" y="88" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="700" fontSize="8" fill="#1f2124" letterSpacing="0.5">
        NEPCAB
      </text>
      <path d="M26 6c-11 0-19 8-19 18 0 13 19 33 19 33s19-20 19-33C45 14 37 6 26 6z" fill="#e0322f" stroke="#fff" strokeWidth="2.5" />
      <circle cx="26" cy="24" r="8.5" fill="#fff" />
      <circle cx="26" cy="24" r="4.5" fill="#e0322f" />
    </svg>
  );
}

export function Wordmark({ className = "", light = false, company = false }: { className?: string; light?: boolean; company?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <LogoMark className="h-10 w-10" />
      <div className="leading-none">
        <div className={`text-xl font-extrabold tracking-tight ${light ? "text-white" : ""}`}>NEPCAB</div>
        <div className={`font-deva text-sm font-semibold ${light ? "text-brand" : "text-ink/70"}`}>यात्राको साथी</div>
        {company && <div className={`mt-1 text-[10px] font-medium ${light ? "text-white/50" : "text-ink/55"}`}>by Praja Ride Pvt. Ltd.</div>}
      </div>
    </div>
  );
}
