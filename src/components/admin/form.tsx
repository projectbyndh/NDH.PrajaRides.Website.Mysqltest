"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "@/components/SubmitButton";
import { AlertCircle, X } from "lucide-react";
import type { FieldErrors } from "@/lib/validation";

type Check = (field: string, value: string) => string | null;

/**
 * Client-side validation for an uncontrolled form:
 * - a field is checked when it loses focus, and re-checked as you type once it has an error
 * - submit is blocked (and the first bad field focused) while anything is invalid
 * - errors returned by the server action are shown until the field is edited
 */
export function useFormValidation(check: Check, serverErrors?: FieldErrors) {
  const [errors, setErrors] = useState<FieldErrors>(serverErrors ?? {});
  const [lastServer, setLastServer] = useState(serverErrors);
  if (serverErrors !== lastServer) {
    setLastServer(serverErrors);
    setErrors(serverErrors ?? {});
  }

  const validate = (name: string, value: string) =>
    setErrors((prev) => {
      const msg = check(name, value);
      if ((prev[name] ?? null) === msg) return prev;
      const next = { ...prev };
      if (msg) next[name] = msg;
      else delete next[name];
      return next;
    });

  const target = (e: { target: EventTarget }) => e.target as HTMLInputElement;

  return {
    errors,
    onBlur: (e: { target: EventTarget }) => {
      const t = target(e);
      if (t.name) validate(t.name, t.value);
    },
    onChange: (e: { target: EventTarget }) => {
      const t = target(e);
      if (t.name && errors[t.name]) validate(t.name, t.type === "checkbox" ? (t.checked ? "on" : "") : t.value);
    },
    onSubmit: (e: FormEvent<HTMLFormElement>) => {
      const found: FieldErrors = {};
      for (const el of Array.from(e.currentTarget.elements) as HTMLInputElement[]) {
        if (!el.name || el.type === "hidden" || el.disabled) continue;
        if (el.type === "radio" && !el.checked) continue;
        const msg = check(el.name, el.type === "checkbox" ? (el.checked ? "on" : "") : el.value);
        if (msg) found[el.name] = msg;
      }
      setErrors(found);
      const first = Object.keys(found)[0];
      if (first) {
        e.preventDefault();
        (e.currentTarget.elements.namedItem(first) as HTMLElement | null)?.focus();
      }
    },
  };
}

export const control = (invalid?: boolean) =>
  [
    "block w-full rounded-xl border bg-white px-3.5 py-2.5 text-[15px] text-ink shadow-sm outline-none transition",
    "placeholder:text-ink/35 focus:ring-4 disabled:cursor-not-allowed disabled:bg-ink/5",
    invalid
      ? "border-pin/60 focus:border-pin focus:ring-pin/15"
      : "border-ink/15 hover:border-ink/25 focus:border-brand-dark focus:ring-brand/25",
  ].join(" ");

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: (props: { id: string; name: string; "aria-invalid": boolean; "aria-describedby"?: string; className: string }) => ReactNode;
};

/** Label + control + hint/error, wired up for screen readers. */
export function Field({ label, name, error, hint, required, className = "", children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-1 text-sm font-semibold text-ink">
        {label}
        {required ? <span className="text-pin" aria-hidden>*</span> : <span className="text-xs font-normal text-ink/65">Optional</span>}
      </label>
      {children({
        id,
        name,
        "aria-invalid": !!error,
        "aria-describedby": error || hint ? msgId : undefined,
        className: control(!!error),
      })}
      {error ? (
        <p id={msgId} className="mt-1.5 flex items-start gap-1 text-[13px] font-medium text-pin">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="mt-1.5 text-[13px] text-ink/65">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-1">
        <span className="text-[13px] font-bold uppercase tracking-wider text-ink/45">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-ink/55">{description}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

export function FormAlert({ children, tone = "error" }: { children: ReactNode; tone?: "error" | "success" }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2 rounded-xl border px-3.5 py-3 text-sm font-medium ${
        tone === "error" ? "border-pin/25 bg-pin/5 text-pin" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

/** Right-hand slide-over panel. Closes on Escape or backdrop click. */
export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !hydrated) return null;
  // Portal to <body>: a transformed ancestor (e.g. a card's hover lift) would otherwise trap "fixed".
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <div ref={panel} className="relative flex h-full w-full max-w-xl flex-col bg-[#fbfaf7] shadow-2xl">
        <div className="flex items-start gap-3 border-b border-ink/10 bg-white px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-ink/55">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink" aria-label="Close panel">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/** Centered dialog for confirmations. Closes on Escape or backdrop click. */
export function Modal({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  const hydrated = useHydrated();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open || !hydrated) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={label}>
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">{children}</div>
    </div>,
    document.body,
  );
}
