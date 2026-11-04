"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, Pencil, Plus, Trash2, Trophy, X } from "lucide-react";
import { control, useFormValidation } from "@/components/admin/form";
import { Badge, btn } from "@/components/admin/ui";
import { useHydrated } from "@/components/SubmitButton";
import type { Tier } from "@/lib/rewards";
import { tierFieldError } from "@/lib/validation";
import { deleteTierAction, saveTierAction, type TierState } from "./actions";

function TierForm({ tier, onDone }: { tier?: Tier; onDone: () => void }) {
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState<TierState, FormData>(async (prev, fd) => {
    const res = await saveTierAction(prev, fd);
    if (res.saved) onDone();
    return res;
  }, {});
  const v = useFormValidation(tierFieldError, state.fieldErrors);
  const val = (k: string, f: string | number | undefined) => state.values?.[k] ?? (f === undefined ? "" : String(f));
  const err = (k: string) => v.errors[k] && <p className="mt-1 text-xs font-medium text-pin">{v.errors[k]}</p>;

  return (
    <form action={action} onSubmit={v.onSubmit} noValidate className="rounded-xl border border-brand-dark/30 bg-brand-light/20 p-4">
      {tier && <input type="hidden" name="id" value={tier.id} />}
      {/* Built for the narrow side column: reward on its own row, numbers side by side. */}
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2 text-xs font-semibold text-ink/60">
          Reward shown to the driver
          <input name="reward" defaultValue={val("reward", tier?.reward)} onBlur={v.onBlur} onChange={v.onChange} aria-invalid={!!v.errors.reward} maxLength={120} placeholder="e.g. Rs 500 bonus" className={`${control(!!v.errors.reward)} mt-1`} />
          {err("reward")}
        </label>
        <label className="text-xs font-semibold text-ink/60">
          Referrals needed
          <input name="target" type="number" min={1} inputMode="numeric" defaultValue={val("target", tier?.target)} onBlur={v.onBlur} onChange={v.onChange} aria-invalid={!!v.errors.target} placeholder="10" className={`${control(!!v.errors.target)} mt-1`} />
          {err("target")}
        </label>
        <label className="text-xs font-semibold text-ink/60">
          Amount (Rs)
          <input name="amountNpr" type="number" min={0} inputMode="numeric" defaultValue={val("amountNpr", tier?.amountNpr ?? 0)} onBlur={v.onBlur} onChange={v.onChange} aria-invalid={!!v.errors.amountNpr} className={`${control(!!v.errors.amountNpr)} mt-1`} />
          {err("amountNpr")}
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex w-full items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="active" defaultChecked={state.values ? state.values.active === "on" : tier?.active ?? true} className="h-4 w-4 accent-ink" />
          Active — can be earned this month
        </label>
        <button type="button" onClick={onDone} className={`${btn.ghost} ml-auto`}>
          <X className="h-4 w-4" /> Cancel
        </button>
        <button disabled={pending || !hydrated} className={btn.primary}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {tier ? "Save tier" : "Add tier"}
        </button>
      </div>
    </form>
  );
}

export function TierEditor({ tiers }: { tiers: Tier[] }) {
  const hydrated = useHydrated();
  const [editing, setEditing] = useState<number | "new" | null>(null);

  return (
    <div className="space-y-2">
      {tiers.length === 0 && editing !== "new" && (
        <p className="rounded-xl bg-ink/[0.03] p-4 text-center text-sm text-ink/55">No tiers yet. Add one so drivers have something to aim for.</p>
      )}
      {tiers.map((t, i) =>
        editing === t.id ? (
          <TierForm key={t.id} tier={t} onDone={() => setEditing(null)} />
        ) : (
          <div key={t.id} className={`group flex items-center gap-3 rounded-xl border border-ink/[0.08] bg-white p-3 ${t.active ? "" : "opacity-55"}`}>
            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold ${t.active ? "bg-brand text-ink" : "bg-ink/10 text-ink/50"}`}>
              {t.target}
            </span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm font-semibold leading-snug">{t.reward}</p>
              <p className="text-xs text-ink/50">
                {t.target} referrals · Rs {t.amountNpr.toLocaleString()} · Level {i + 1}
              </p>
            </div>
            {!t.active && <Badge>Off</Badge>}
            <button onClick={() => setEditing(t.id)} disabled={!hydrated} className="rounded-lg p-2 text-ink/40 hover:bg-ink/5 hover:text-ink" title="Edit tier">
              <Pencil className="h-4 w-4" />
            </button>
            <form action={deleteTierAction.bind(null, t.id)}>
              <button
                disabled={!hydrated}
                onClick={(e) => {
                  if (!window.confirm(`Delete “${t.reward}”? Rewards already earned are kept.`)) e.preventDefault();
                }}
                className="rounded-lg p-2 text-ink/40 hover:bg-pin/10 hover:text-pin"
                title="Delete tier"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </form>
          </div>
        ),
      )}
      {editing === "new" ? (
        <TierForm onDone={() => setEditing(null)} />
      ) : (
        <button onClick={() => setEditing("new")} disabled={!hydrated} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/15 p-3 text-sm font-semibold text-ink/55 transition hover:border-brand-dark hover:bg-brand-light/20 hover:text-ink">
          <Plus className="h-4 w-4" /> Add a tier
        </button>
      )}
      <p className="flex items-center gap-1.5 pt-1 text-xs text-ink/45">
        <Trophy className="h-3.5 w-3.5" /> Drivers earn every tier they reach in a month.
      </p>
    </div>
  );
}
