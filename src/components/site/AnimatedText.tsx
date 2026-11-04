"use client";

import { useEffect, useRef, type ElementType } from "react";

type Line = { text: string; className?: string };

/** Splits a line into words; *asterisks* are dropped (headings are one colour, so no word is highlighted). */
function parseWords(text: string): { text: string; em: boolean }[] {
  let em = false;
  return text.split(/\s+/).filter(Boolean).map((raw) => {
    // Punctuation may sit outside the asterisks: "*wheels*," or "(*city*)".
    const opens = /^[^\p{L}\p{N}*]*\*/u.test(raw);
    const closes = /\*[^\p{L}\p{N}*]*$/u.test(raw) && (raw.replace(/[^*]/g, "").length > 1 || !opens);
    if (opens) em = true;
    const word = { text: raw.replace(/\*/g, ""), em };
    if (closes) em = false;
    return word;
  });
}

/**
 * Reveals text word by word: each word rises out of a mask, one after another.
 * Plays when scrolled into view (or right away with `immediate`, for heroes).
 * Screen readers get the plain sentence; the animated words are hidden from them.
 */
export function AnimatedText({
  lines,
  as: Tag = "span",
  className = "",
  immediate = false,
  stagger = 70,
  startDelay = 0,
}: {
  lines: (string | Line)[];
  as?: ElementType;
  className?: string;
  immediate?: boolean;
  stagger?: number;
  startDelay?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (immediate) return; // plays from CSS on first paint, no JS needed (see [data-split="now"])
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("is-visible");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [immediate]);

  const norm = lines.map((l) => (typeof l === "string" ? { text: l } : l));
  const plain = norm.map((l) => l.text.replace(/\*/g, "")).join(" ");
  let i = 0;


  return (
    <Tag ref={ref} data-split={immediate ? "now" : ""} className={className}>
      <span className="sr-only">{plain}</span>
      <span aria-hidden>
        {norm.map((line, li) => (
          <span key={li} className="split-line">
            {parseWords(line.text).map((word, wi, arr) => {
              const d = startDelay + i++ * stagger;
              return (
                <span key={wi}>
                  <span className="split-word">
                    <span className={line.className} style={{ "--d": `${d}ms` } as React.CSSProperties}>
                      {word.text}
                    </span>
                  </span>
                  {wi < arr.length - 1 ? " " : null}
                </span>
              );
            })}
            {li < norm.length - 1 && <br />}
          </span>
        ))}
      </span>
    </Tag>
  );
}
