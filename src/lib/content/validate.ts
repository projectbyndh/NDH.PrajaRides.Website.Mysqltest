import type { Field } from "./types";
import { ICONS } from "../icons";

// Cleans block data from the admin editor against its fields: unknown keys dropped, strings
// trimmed and capped, icons and image slots checked, lists capped. Returns the clean data and any
// field errors (paths like "items.2.title").

type Errors = Record<string, string>;

const DEFAULT_MAX = { text: 160, url: 300, textarea: 1500, lines: 30 } as const;

export function cleanFields(fields: Field[], raw: unknown, isImage: (slot: string) => boolean, path = "", errors: Errors = {}) {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const at = path ? `${path}.${f.key}` : f.key;
    const v = src[f.key];
    switch (f.type) {
      case "text":
      case "url":
      case "textarea": {
        const s = typeof v === "string" ? v.replace(/\r/g, "").trim() : "";
        const max = f.max ?? DEFAULT_MAX[f.type];
        if (s.length > max) errors[at] = `Keep it under ${max} characters.`;
        // Links may start with a placeholder filled in on the page, e.g. {whatsapp} or {map}
        if (f.type === "url" && s && !/^(\/|https?:\/\/|tel:|mailto:|#|\{\w+\})/.test(s)) errors[at] = "Use a page path like /drive, or a full https:// link.";
        out[f.key] = s.slice(0, max);
        break;
      }
      case "icon":
        out[f.key] = typeof v === "string" && ICONS[v] ? v : "check";
        break;
      case "image": {
        const s = typeof v === "string" ? v : "";
        if (s && !isImage(s)) errors[at] = "Pick an image from the list.";
        out[f.key] = s;
        break;
      }
      case "toggle":
        out[f.key] = v === true;
        break;
      case "lines": {
        const list = Array.isArray(v) ? v : [];
        out[f.key] = list
          .map((x) => (typeof x === "string" ? x.trim().slice(0, 200) : ""))
          .filter(Boolean)
          .slice(0, f.max ?? DEFAULT_MAX.lines);
        break;
      }
      case "list": {
        const list = Array.isArray(v) ? v : [];
        out[f.key] = list.slice(0, f.max ?? 30).map((item, i) => cleanFields(f.item, item, isImage, `${at}.${i}`, errors).data);
        break;
      }
    }
  }
  return { data: out, errors };
}
