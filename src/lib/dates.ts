// Helpers for 'YYYY-MM-DD' date strings (document expiries, birthdays). Nepal time.

const TZ = "Asia/Kathmandu";

/** Today's date in Nepal as 'YYYY-MM-DD'. */
export const todayNepal = () => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());

/** Whole days from today (Nepal) until `iso`; negative when it's in the past. */
export function daysUntil(iso: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${todayNepal()}T00:00:00Z`)) / 86_400_000);
}

export const formatDay = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export type ExpiryState = "expired" | "soon" | "ok";
export const expiryState = (iso: string, warnDays = 30): ExpiryState => {
  const d = daysUntil(iso);
  return d < 0 ? "expired" : d <= warnDays ? "soon" : "ok";
};

export function expiryText(iso: string): string {
  const d = daysUntil(iso);
  if (d < 0) return `Expired ${-d} day${d === -1 ? "" : "s"} ago`;
  if (d === 0) return "Expires today";
  if (d <= 30) return `Expires in ${d} day${d === 1 ? "" : "s"}`;
  return `Valid until ${formatDay(iso)}`;
}
