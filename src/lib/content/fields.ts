import type { Field } from "./types";

// Field sets reused by many blocks (home in blocks.ts, other pages in ./pages).
export const heading: Field[] = [
  { key: "eyebrow", label: "Small label above the title", type: "text", max: 60 },
  { key: "title", label: "Title", type: "text", max: 120 },
];
export const iconCard: Field[] = [
  { key: "icon", label: "Icon", type: "icon" },
  { key: "title", label: "Title", type: "text", max: 80 },
  { key: "text", label: "Text", type: "textarea", max: 300, rows: 2 },
];
export const step: Field[] = [
  { key: "title", label: "Title", type: "text", max: 80 },
  { key: "text", label: "Text", type: "textarea", max: 300, rows: 2 },
];
export const faq: Field[] = [
  { key: "q", label: "Question", type: "text", max: 160 },
  { key: "a", label: "Answer", type: "textarea", max: 800, rows: 3 },
];
