"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

// A designed dropdown that drops in for <select>: same props and <option> children, so forms,
// FormData and the shared validation keep working. A hidden native <select> carries the value;
// the visible part is a button with a styled list (keyboard and screen-reader friendly).

type Opt = { value: string; label: ReactNode; text: string; disabled: boolean };
type OptionProps = { value?: string | number; children?: ReactNode; disabled?: boolean };

const textOf = (node: ReactNode): string =>
  typeof node === "string" || typeof node === "number"
    ? String(node)
    : Array.isArray(node)
      ? node.map(textOf).join("")
      : isValidElement<{ children?: ReactNode }>(node)
        ? textOf(node.props.children)
        : "";

/** <option> elements (also inside arrays and fragments) as a flat list. */
function readOptions(children: ReactNode): Opt[] {
  const out: Opt[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    if (child.type === "option") {
      const p = (child as ReactElement<OptionProps>).props;
      const text = textOf(p.children);
      out.push({ value: p.value === undefined ? text : String(p.value), label: p.children, text, disabled: !!p.disabled });
    } else {
      out.push(...readOptions((child as ReactElement<{ children?: ReactNode }>).props.children));
    }
  });
  return out;
}

type Place = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

export function Select({
  children,
  value,
  defaultValue,
  onChange,
  onBlur,
  name,
  id,
  className = "",
  disabled,
  required,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: ComponentPropsWithoutRef<"select">) {
  const options = readOptions(children);
  const uid = useId();
  const [inner, setInner] = useState(() => String(defaultValue ?? options[0]?.value ?? ""));
  const current = value !== undefined ? String(value) : inner;
  const selected = options.find((o) => o.value === current) ?? options[0];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [place, setPlace] = useState<Place | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: "", at: 0 });

  const optId = (i: number) => `${uid}-opt-${i}`;

  // Place the list under the button (or above it when there's no room), in page coordinates.
  const measure = () => {
    const r = button.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 220 && above > below;
    setPlace({
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 200) - 8)),
      width: r.width,
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
      maxHeight: Math.min(320, up ? above : below),
    });
  };

  const openList = () => {
    if (disabled) return;
    measure();
    setActive(Math.max(0, options.findIndex((o) => o.value === current)));
    setOpen(true);
  };
  const close = () => setOpen(false);

  const choose = (i: number) => {
    const o = options[i];
    if (!o || o.disabled) return;
    close();
    if (o.value === current) return;
    if (value === undefined) setInner(o.value);
    const el = native.current;
    if (el) {
      el.value = o.value;
      onChange?.({ target: el, currentTarget: el } as ChangeEvent<HTMLSelectElement>);
    }
  };

  const move = (from: number, step: number) => {
    for (let i = from + step, n = 0; n < options.length; i += step, n++) {
      const j = (i + options.length) % options.length;
      if (!options[j].disabled) return j;
    }
    return from;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") close();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => move(a, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => move(a, -1));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? move(-1, 1) : move(options.length, -1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key.length === 1) {
      // Type to jump: "kh" finds "Khalti"
      const now = Date.now();
      typed.current = { text: (now - typed.current.at < 700 ? typed.current.text : "") + e.key.toLowerCase(), at: now };
      const hit = options.findIndex((o) => !o.disabled && o.text.toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
    }
  };

  // Close on outside click; follow the button on scroll and resize.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!button.current?.contains(t) && !list.current?.contains(t)) close();
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  });

  // Keep the highlighted option in view.
  useLayoutEffect(() => {
    if (open) document.getElementById(optId(active))?.scrollIntoView({ block: "nearest" });
  });

  const handleBlur = (e: FocusEvent<HTMLButtonElement>) => {
    if (list.current?.contains(e.relatedTarget as Node)) return;
    close();
    if (native.current) onBlur?.({ target: native.current, currentTarget: native.current } as FocusEvent<HTMLSelectElement>);
  };

  const placeholder = !selected || selected.value === "";

  return (
    <>
      {/* Carries the value for forms and validation; focus goes to the button. */}
      <select
        ref={native}
        name={name}
        value={current}
        required={required}
        disabled={disabled}
        onChange={() => {}}
        onFocus={() => button.current?.focus()}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.text}
          </option>
        ))}
      </select>
      <button
        ref={button}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${uid}-list`}
        aria-activedescendant={open ? optId(active) : undefined}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        data-select=""
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        onBlur={handleBlur}
        className={`${className.replace(/(^|\s)block(?=\s|$)/g, " ")} flex items-center justify-between gap-2 text-left ${open ? "ring-4 ring-brand/25" : ""}`}
      >
        <span className={`min-w-0 truncate ${placeholder ? "text-ink/45" : ""}`}>{selected?.label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-ink/45 transition duration-200 ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open &&
        place &&
        createPortal(
          <ul
            ref={list}
            id={`${uid}-list`}
            role="listbox"
            aria-label={ariaLabel}
            style={{ position: "fixed", left: place.left, top: place.top, bottom: place.bottom, minWidth: place.width, maxHeight: place.maxHeight }}
            className="z-[70] max-w-[min(26rem,calc(100vw-1rem))] overflow-y-auto overscroll-contain rounded-2xl bg-white p-1.5 text-[15px] text-ink shadow-[0_18px_48px_-12px_rgba(16,24,40,0.28)] ring-1 ring-ink/10"
          >
            {options.map((o, i) => {
              const isSelected = o.value === current;
              return (
                <li
                  key={o.value}
                  id={optId(i)}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={o.disabled || undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => !o.disabled && setActive(i)}
                  onClick={() => choose(i)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    o.disabled ? "cursor-not-allowed opacity-40" : i === active ? "bg-ink/[0.06]" : ""
                  } ${isSelected ? "font-semibold" : ""} ${o.value === "" ? "text-ink/55" : ""}`}
                >
                  <span className="min-w-0">{o.label}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-ink" aria-hidden />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}
