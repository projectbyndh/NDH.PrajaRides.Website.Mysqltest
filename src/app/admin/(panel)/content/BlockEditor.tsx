"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { control, FormAlert } from "@/components/admin/form";
import { btn, Card } from "@/components/admin/ui";
import type { Field } from "@/lib/content/types";
import type { ImageChoice } from "@/lib/content/store";
import { DynamicIcon } from "@/components/DynamicIcon";
import { ICON_NAMES } from "@/lib/icons";
import { saveBlockAction } from "./actions";
import { Select } from "@/components/Select";

// Generic editor for one content block: renders a form from the block's fields. Lists can be
// added to, removed from and reordered. Saves the whole block as JSON.

type Data = Record<string, unknown>;
type Ctx = { images: ImageChoice[]; errors: Record<string, string> };

const emptyFor = (fields: Field[]): Data =>
  Object.fromEntries(fields.map((f) => [f.key, f.type === "list" || f.type === "lines" ? [] : f.type === "toggle" ? false : f.type === "icon" ? "check" : ""]));

function Label({ f, path, ctx }: { f: Field; path: string; ctx: Ctx }) {
  return (
    <span className="mb-1.5 block text-sm font-semibold text-ink">
      {f.label}
      {f.hint && <span className="mt-0.5 block text-xs font-normal text-ink/55">{f.hint}</span>}
      {ctx.errors[path] && <span className="mt-0.5 block text-xs font-medium text-pin">{ctx.errors[path]}</span>}
    </span>
  );
}

function FieldInput({ f, value, onChange, path, ctx }: { f: Field; value: unknown; onChange: (v: unknown) => void; path: string; ctx: Ctx }) {
  const invalid = !!ctx.errors[path];
  switch (f.type) {
    case "text":
    case "url":
      return (
        <label className="block">
          <Label f={f} path={path} ctx={ctx} />
          <input className={control(invalid)} value={(value as string) ?? ""} maxLength={f.max ?? 300} onChange={(e) => onChange(e.target.value)} placeholder={f.type === "url" ? "/page or https://…" : ""} />
        </label>
      );
    case "textarea":
      return (
        <label className="block">
          <Label f={f} path={path} ctx={ctx} />
          <textarea className={control(invalid)} rows={f.rows ?? 3} value={(value as string) ?? ""} maxLength={f.max ?? 1500} onChange={(e) => onChange(e.target.value)} />
        </label>
      );
    case "toggle":
      return (
        <label className="flex items-center gap-2.5 pt-6 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5 accent-ink" checked={value === true} onChange={(e) => onChange(e.target.checked)} /> {f.label}
        </label>
      );
    case "icon": {
      return (
        <label className="block">
          <Label f={f} path={path} ctx={ctx} />
          <span className="flex items-center gap-2">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand/30">
              <DynamicIcon name={value as string} className="h-5 w-5" />
            </span>
            <Select className={control(invalid)} value={(value as string) || "check"} onChange={(e) => onChange(e.target.value)}>
              {ICON_NAMES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </span>
        </label>
      );
    }
    case "image":
      return (
        <label className="block">
          <Label f={f} path={path} ctx={ctx} />
          <span className="flex items-center gap-2">
            <span className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-ink/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {value ? <img src={`/media/site/${value}?s=thumb`} alt="" className="h-full w-full object-cover" /> : null}
            </span>
            <Select className={control(invalid)} value={(value as string) || ""} onChange={(e) => onChange(e.target.value)}>
              <option value="">No photo</option>
              {ctx.images.map((i) => (
                <option key={i.slot} value={i.slot}>
                  {i.label}
                </option>
              ))}
            </Select>
          </span>
        </label>
      );
    case "lines": {
      const list = (value as string[]) ?? [];
      return (
        <label className="block">
          <Label f={f} path={path} ctx={ctx} />
          <textarea
            className={control(invalid)}
            rows={Math.max(3, list.length + 1)}
            value={list.join("\n")}
            onChange={(e) => onChange(e.target.value.split("\n"))}
            placeholder="One per line"
          />
        </label>
      );
    }
    case "list": {
      const list = ((value as Data[]) ?? []).slice();
      const set = (next: Data[]) => onChange(next);
      return (
        <div className="sm:col-span-2">
          <Label f={f} path={path} ctx={ctx} />
          <ol className="space-y-3">
            {list.map((item, i) => (
              <li key={i} className="rounded-xl border border-ink/10 bg-ink/[0.02] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink/45">
                    {f.itemLabel} {i + 1}
                  </span>
                  <span className="flex gap-1">
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => set(list.map((x, j) => (j === i - 1 ? list[i] : j === i ? list[i - 1] : x)))} className="rounded-md p-1.5 text-ink/50 hover:bg-ink/5 disabled:opacity-30">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label="Move down" disabled={i === list.length - 1} onClick={() => set(list.map((x, j) => (j === i + 1 ? list[i] : j === i ? list[i + 1] : x)))} className="rounded-md p-1.5 text-ink/50 hover:bg-ink/5 disabled:opacity-30">
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={`Remove ${f.itemLabel.toLowerCase()} ${i + 1}`} onClick={() => set(list.filter((_, j) => j !== i))} className="rounded-md p-1.5 text-ink/50 hover:bg-pin/10 hover:text-pin">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </div>
                <Fields fields={f.item} data={item} onChange={(next) => set(list.map((x, j) => (j === i ? next : x)))} path={`${path}.${i}`} ctx={ctx} />
              </li>
            ))}
          </ol>
          {list.length < (f.max ?? 30) && (
            <button type="button" onClick={() => set([...list, emptyFor(f.item)])} className={`${btn.secondary} mt-3`}>
              <Plus className="h-4 w-4" /> Add {f.itemLabel.toLowerCase()}
            </button>
          )}
        </div>
      );
    }
  }
}

function Fields({ fields, data, onChange, path, ctx }: { fields: Field[]; data: Data; onChange: (d: Data) => void; path: string; ctx: Ctx }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className={f.type === "textarea" || f.type === "list" || f.type === "lines" ? "sm:col-span-2" : ""}>
          <FieldInput f={f} value={data[f.key]} onChange={(v) => onChange({ ...data, [f.key]: v })} path={path ? `${path}.${f.key}` : f.key} ctx={ctx} />
        </div>
      ))}
    </div>
  );
}

export function BlockEditor({ blockKey, title, description, fields, initial, images }: { blockKey: string; title: string; description?: string; fields: Field[]; initial: Data; images: ImageChoice[] }) {
  const [data, setData] = useState<Data>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const res = await saveBlockAction(blockKey, JSON.stringify(data));
      if (res.ok) {
        setErrors({});
        setDirty(false);
        setMessage({ ok: true, text: "Saved. The website shows the new content now." });
      } else {
        setErrors(res.fieldErrors ?? {});
        setMessage({ ok: false, text: res.error });
      }
    });

  return (
    <Card>
      <div className="mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-ink/55">{description}</p>}
      </div>
      {message && (
        <div className="mb-4">
          <FormAlert tone={message.ok ? "success" : "error"}>{message.text}</FormAlert>
        </div>
      )}
      <Fields
        fields={fields}
        data={data}
        onChange={(d) => {
          setData(d);
          setDirty(true);
          setMessage(null);
        }}
        path=""
        ctx={{ images, errors }}
      />
      <div className="mt-5 flex items-center justify-end gap-3">
        {dirty && <span className="text-xs font-medium text-amber-700">Unsaved changes</span>}
        <button type="button" onClick={save} disabled={pending} className={btn.primary}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : dirty ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />} Save
        </button>
      </div>
    </Card>
  );
}
