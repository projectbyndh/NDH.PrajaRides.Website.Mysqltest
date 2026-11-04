import { createElement } from "react";
import { iconFor } from "@/lib/icons";

/** Renders an icon chosen by name in admin (see src/lib/icons.ts). */
export function DynamicIcon({ name, className, strokeWidth }: { name: string | null | undefined; className?: string; strokeWidth?: number }) {
  return createElement(iconFor(name), { className, strokeWidth, "aria-hidden": true });
}
