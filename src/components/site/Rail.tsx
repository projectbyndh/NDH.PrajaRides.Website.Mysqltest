"use client";

import { Children, useRef, useState, type ReactNode } from "react";

// A card list that is a grid on tablets and up, and a swipeable row on phones (the `.rail` rule in
// globals.css) with dots underneath showing where you are. Pass the grid classes as `className`.

export function Rail({ children, className = "", as: Tag = "ul", label }: { children: ReactNode; className?: string; as?: "ul" | "ol" | "div"; label?: string }) {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const count = Children.toArray(children).filter(Boolean).length;

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const items = Array.from(el.children) as HTMLElement[];
    const start = items[0]?.offsetLeft ?? 0;
    let best = 0;
    items.forEach((it, i) => {
      if (Math.abs(it.offsetLeft - start - el.scrollLeft) < Math.abs(items[best].offsetLeft - start - el.scrollLeft)) best = i;
    });
    // At the far end the last card may never reach the start edge
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) best = items.length - 1;
    setActive(best);
  };

  const go = (i: number) => {
    const el = ref.current;
    const items = el ? (Array.from(el.children) as HTMLElement[]) : [];
    if (!el || !items[i]) return;
    el.scrollTo({ left: items[i].offsetLeft - items[0].offsetLeft, behavior: "smooth" });
  };

  return (
    <div>
      <Tag ref={ref as never} onScroll={onScroll} className={`rail ${className}`} aria-label={label}>
        {children}
      </Tag>
      {count > 1 && (
        <div className="mt-3 flex justify-center gap-1.5 sm:hidden" aria-hidden>
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === active ? "w-6 bg-accent" : "w-1.5 bg-ink/20"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
