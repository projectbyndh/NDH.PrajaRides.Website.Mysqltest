"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, Loader2, Pencil, RefreshCw, ShieldCheck, Trash2, TriangleAlert } from "lucide-react";
import { control, Drawer, Modal } from "@/components/admin/form";
import { btn } from "@/components/admin/ui";
import { useHydrated } from "@/components/SubmitButton";
import type { Driver } from "@/lib/drivers";
import { deleteDriverAction, regenerateCodeAction, verifyDriverAction } from "./actions";
import { EditDriverForm } from "./DriverForms";

export function EditDriverButton({ driver, variant = "button" }: { driver: Driver; variant?: "button" | "icon" }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);
  return (
    <>
      <button
        onClick={() => {
          setRound((r) => r + 1);
          setOpen(true);
        }}
        disabled={!hydrated}
        title={`Edit ${driver.name}`}
        className={variant === "icon" ? "rounded-lg p-2 text-ink/45 transition hover:bg-ink/5 hover:text-ink" : btn.secondary}
      >
        <Pencil className="h-4 w-4" />
        {variant === "button" && "Edit"}
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title={`Edit ${driver.name}`} description={`Driver ${driver.id} · fields marked * are required.`}>
        <EditDriverForm key={round} driver={driver} onSaved={() => setOpen(false)} />
      </Drawer>
    </>
  );
}

export function DeleteDriverButton({ driver, variant = "button", backToList = false }: { driver: Driver; variant?: "button" | "icon"; backToList?: boolean }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const matches = typed.trim().toUpperCase() === driver.id;

  const close = () => {
    setOpen(false);
    setTyped("");
    setError(null);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!hydrated}
        title={`Delete ${driver.name}`}
        className={
          variant === "icon"
            ? "rounded-lg p-2 text-ink/45 transition hover:bg-pin/10 hover:text-pin"
            : "inline-flex items-center justify-center gap-2 rounded-xl border border-pin/25 bg-white px-4 py-2.5 text-sm font-semibold text-pin shadow-sm transition hover:bg-pin/5 disabled:opacity-50"
        }
      >
        <Trash2 className="h-4 w-4" />
        {variant === "button" && "Delete"}
      </button>
      <Modal open={open} onClose={close} label={`Delete ${driver.name}`}>
        <div className="flex gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pin/10 text-pin">
            <TriangleAlert className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold">Delete {driver.name}?</h2>
            <p className="mt-1 text-sm text-ink/60">
              Their profile and portal login are removed. Scan history and rewards already earned are <b>kept</b>, and {driver.id} can be registered again later.
            </p>
          </div>
        </div>
        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!matches) return setError(`Type ${driver.id} to confirm.`);
            start(async () => {
              const res = await deleteDriverAction(driver.id, typed, backToList);
              if (res?.error) setError(res.error);
              else close();
            });
          }}
        >
          <label className="block text-sm font-semibold">
            Type <span className="rounded bg-ink/[0.06] px-1.5 py-0.5 font-mono">{driver.id}</span> to confirm
            <input
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setError(null);
              }}
              autoFocus
              autoComplete="off"
              aria-invalid={!!error}
              className={`${control(!!error)} mt-1.5 font-mono uppercase`}
            />
          </label>
          {error && <p className="text-sm font-medium text-pin">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={close} className={btn.secondary}>
              Cancel
            </button>
            <button
              disabled={!matches || pending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-pin px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-pin/90 disabled:opacity-40"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete driver
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function ViewDriverLink({ id, variant = "button" }: { id: string; variant?: "button" | "icon" }) {
  return (
    <Link
      href={`/admin/drivers/${id}`}
      title="View details"
      className={variant === "icon" ? "rounded-lg p-2 text-ink/45 transition hover:bg-ink/5 hover:text-ink" : btn.secondary}
    >
      <Eye className="h-4 w-4" />
      {variant === "button" && "View"}
    </Link>
  );
}

/** Issues a new referral code (e.g. if a link was misused). Old QR codes and links stop crediting the driver. */
export function RegenerateCodeButton({ driverId }: { driverId: string }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <button onClick={() => setOpen(true)} disabled={!hydrated} className={`${btn.ghost} mt-2 -ml-3`}>
        <RefreshCw className="h-4 w-4" /> Generate new link
      </button>
      <Modal open={open} onClose={() => setOpen(false)} label="Generate a new referral link">
        <h2 className="text-lg font-bold">Generate a new link?</h2>
        <p className="mt-1 text-sm text-ink/60">
          The driver gets a new code. Their <b>old QR stickers and shared links will stop counting</b>, so you&apos;ll need to send or print the new QR. History is kept.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className={btn.secondary}>
            Cancel
          </button>
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                await regenerateCodeAction(driverId);
                setOpen(false);
              })
            }
            className={btn.primary}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Generate new link
          </button>
        </div>
      </Modal>
    </>
  );
}

/** Unlocks the driver's QR code and referral link once the office has checked their details. */
export function VerifyDriverButton({ driver }: { driver: Driver }) {
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        disabled={!hydrated || pending}
        onClick={() =>
          start(async () => {
            const res = await verifyDriverAction(driver.id);
            setError(res.error ?? null);
          })
        }
        className={btn.primary}
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Verify details
      </button>
      {error && <p className="text-sm font-medium text-pin">{error}</p>}
    </div>
  );
}
