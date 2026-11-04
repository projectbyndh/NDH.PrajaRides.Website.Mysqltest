"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCheck, Loader2, RotateCcw, X } from "lucide-react";
import { btn } from "@/components/admin/ui";
import { useHydrated } from "@/components/SubmitButton";
import type { BookingStatus } from "@/lib/bookings";
import { setBookingStatusAction } from "./actions";

const NEXT: Record<BookingStatus, { to: BookingStatus; label: string; icon: typeof Check; style: string }[]> = {
  new: [
    { to: "cancelled", label: "Cancel", icon: X, style: btn.secondary },
    { to: "confirmed", label: "Confirm", icon: Check, style: btn.primary },
  ],
  confirmed: [
    { to: "cancelled", label: "Cancel", icon: X, style: btn.secondary },
    { to: "completed", label: "Mark completed", icon: CheckCheck, style: btn.primary },
  ],
  completed: [{ to: "confirmed", label: "Undo", icon: RotateCcw, style: btn.ghost }],
  cancelled: [{ to: "new", label: "Reopen", icon: RotateCcw, style: btn.ghost }],
};

/** Moves a booking along: new → confirmed → completed, or cancelled. */
export function BookingActions({ id, status }: { id: string; status: BookingStatus }) {
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<BookingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <span className="text-sm font-medium text-pin">{error}</span>}
      {NEXT[status].map(({ to, label, icon: Icon, style }) => (
        <button
          key={to}
          disabled={!hydrated || pending}
          onClick={() => {
            setBusy(to);
            start(async () => {
              const res = await setBookingStatusAction(id, to);
              setError(res.error ?? null);
            });
          }}
          className={style}
        >
          {pending && busy === to ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />} {label}
        </button>
      ))}
    </div>
  );
}

/** Reloads the list every 30 seconds so new requests show up without refreshing. */
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
