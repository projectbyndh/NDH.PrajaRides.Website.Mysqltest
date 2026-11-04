"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, X } from "lucide-react";
import { control, Drawer, Modal } from "@/components/admin/form";
import { btn } from "@/components/admin/ui";
import { useHydrated } from "@/components/SubmitButton";
import { AddDriverForm, randomPin } from "../drivers/DriverForms";
import { rejectApplicationAction, reopenApplicationAction } from "./actions";

/** Opens the add-driver form pre-filled from the application; creating the driver approves it. */
export function ApproveButton({ applicationId, name, initial, nextId, portalUrl }: { applicationId: string; name: string; initial: Record<string, string>; nextId: string; portalUrl: string }) {
  const hydrated = useHydrated();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  // Refresh the list only once the panel closes, so the one-time PIN stays visible until then.
  const close = () => {
    setOpen(false);
    router.refresh();
  };
  return (
    <>
      <button
        onClick={() => {
          setPin(randomPin());
          setOpen(true);
        }}
        disabled={!hydrated}
        className={btn.primary}
      >
        <Check className="h-4 w-4" /> Approve
      </button>
      <Drawer open={open} onClose={close} title={`Approve ${name}`} description="Creates their driver portal login. They complete their profile after logging in, then you verify it.">
        <AddDriverForm key={pin} applicationId={applicationId} initial={initial} nextId={nextId} portalUrl={portalUrl} onDone={close} initialPin={pin} />
      </Drawer>
    </>
  );
}

export function RejectButton({ applicationId, name }: { applicationId: string; name: string }) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button onClick={() => setOpen(true)} disabled={!hydrated} className={btn.secondary}>
        <X className="h-4 w-4" /> Reject
      </button>
      <Modal open={open} onClose={() => setOpen(false)} label={`Reject ${name}`}>
        <h2 className="text-lg font-bold">Reject {name}&apos;s application?</h2>
        <p className="mt-1 text-sm text-ink/60">You can reopen it later. The applicant isn&apos;t notified automatically.</p>
        <label className="mt-4 block text-sm font-semibold">
          Reason <span className="font-normal text-ink/45">(optional, for your records)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={300} className={`${control()} mt-1.5`} placeholder="e.g. License expired, vehicle too old" />
        </label>
        {error && <p className="mt-2 text-sm font-medium text-pin">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setOpen(false)} className={btn.secondary}>
            Cancel
          </button>
          <button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await rejectApplicationAction(applicationId, note);
                if (res.error) setError(res.error);
                else setOpen(false);
              })
            }
            className="inline-flex items-center gap-2 rounded-xl bg-pin px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />} Reject
          </button>
        </div>
      </Modal>
    </>
  );
}

export function ReopenButton({ applicationId }: { applicationId: string }) {
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  return (
    <button disabled={!hydrated || pending} onClick={() => start(() => reopenApplicationAction(applicationId))} className={btn.ghost}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Reopen
    </button>
  );
}
