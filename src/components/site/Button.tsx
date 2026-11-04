import Link from "next/link";
import type { ComponentPropsWithoutRef, ComponentType, ReactNode } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";

// The one button for the public Praja Ride site. Pick a variant by the surface it sits on:
//   primary   yellow, the main action in any section (navy text: white on yellow is unreadable)
//   secondary navy, a strong action on light surfaces
//   light     white, a strong second action on navy surfaces
//   outline   navy outline on light surfaces (fills navy on hover);  outline-dark: the same on navy surfaces
//   link      inline text action with an arrow, no underline ("All services ↗")

export type ButtonVariant = "primary" | "secondary" | "light" | "outline" | "outline-dark" | "link" | "link-dark";
export type ButtonSize = "sm" | "md" | "lg";

type Icon = ComponentType<{ className?: string }>;

type StyleProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the container width. */
  full?: boolean;
  className?: string;
};

type ContentProps = {
  /** Icon before the label. */
  icon?: Icon;
  /** Extra classes for the leading icon (e.g. "animate-ring"). */
  iconClassName?: string;
  /** Trailing arrow that nudges on hover: "right" for next steps, "out" for "go to" links. */
  arrow?: "right" | "out";
  children?: ReactNode;
};

const BASE =
  "group inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-display font-semibold tracking-[-0.01em] transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-60";

const SIZES: Record<ButtonSize, string> = {
  sm: "h-10 rounded-lg px-5 text-sm",
  md: "h-12 rounded-xl px-6 text-[15px]",
  lg: "h-14 rounded-[0.875rem] px-7 text-[15.5px]",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-navy shadow-[0_4px_12px_-6px_rgb(2_10_31/0.35)] hover:bg-accent-bright active:scale-[0.98]",
  secondary: "bg-navy text-white shadow-[0_4px_12px_-6px_rgb(2_10_31/0.45)] hover:bg-navy-soft active:scale-[0.98]",
  light: "bg-white text-navy shadow-[0_4px_12px_-6px_rgb(0_0_0/0.35)] hover:bg-paper active:scale-[0.98]",
  outline: "bg-transparent text-navy ring-[1.5px] ring-inset ring-navy hover:bg-navy hover:text-white active:scale-[0.98]",
  "outline-dark": "bg-white/[0.04] text-white ring-1 ring-inset ring-white/20 hover:bg-white/[0.1] hover:ring-white/40 active:scale-[0.98]",
  link: "text-navy hover:text-accent-deep",
  "link-dark": "text-white hover:text-accent",
};

/** Class string for a button, for the rare element that can't use <Button>/<ButtonLink>. */
export function buttonClass({ variant = "primary", size = "md", full = false, className = "" }: StyleProps = {}) {
  const isLink = variant === "link" || variant === "link-dark";
  return [BASE, isLink ? "" : SIZES[size], VARIANTS[variant], full ? "w-full" : "", className].filter(Boolean).join(" ");
}

function Content({ icon: IconEl, iconClassName = "", arrow, children }: ContentProps) {
  const Arrow = arrow === "out" ? ArrowUpRight : ArrowRight;
  const motion = arrow === "out" ? "group-hover:-translate-y-0.5 group-hover:translate-x-0.5" : "group-hover:translate-x-0.5";
  return (
    <>
      {IconEl && <IconEl className={`h-[1.15em] w-[1.15em] shrink-0 ${iconClassName}`} aria-hidden />}
      {children}
      {arrow && <Arrow className={`h-[1.1em] w-[1.1em] shrink-0 transition-transform ${motion}`} aria-hidden />}
    </>
  );
}

type ButtonLinkProps = StyleProps & ContentProps & Omit<ComponentPropsWithoutRef<"a">, "className" | "children">;

/**
 * A link styled as a button. Internal paths ("/drive", "#book") use next/link; tel:, mailto: and
 * web links render a plain <a>, and web links open in a new tab.
 */
export function ButtonLink({ href, variant, size, full, className, icon, iconClassName, arrow, children, ...rest }: ButtonLinkProps & { href: string }) {
  const cls = buttonClass({ variant, size, full, className });
  const content = <Content {...{ icon, iconClassName, arrow }}>{children}</Content>;
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} className={cls} {...rest}>
        {content}
      </Link>
    );
  }
  const external = /^https?:/.test(href);
  return (
    <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
      {content}
    </a>
  );
}

type ButtonProps = StyleProps & ContentProps & Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

/** A real <button> (form submits, toggles). Defaults to type="button". */
export function Button({ variant, size, full, className, icon, iconClassName, arrow, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClass({ variant, size, full, className })} {...rest}>
      <Content {...{ icon, iconClassName, arrow }}>{children}</Content>
    </button>
  );
}
