"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, ClipboardList, FileText, Gift, Globe, ImageIcon, Layers, Images, Inbox, LayoutDashboard, MoreHorizontal, Newspaper, Users } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Overview", short: "Home", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", short: "Bookings", icon: CalendarCheck },
  { href: "/admin/drivers", label: "Drivers", short: "Drivers", icon: Users },
  { href: "/admin/applications", label: "Applications", short: "Applied", icon: ClipboardList },
  { href: "/admin/messages", label: "Messages", short: "Inbox", icon: Inbox },
  { href: "/admin/rewards", label: "Rewards", short: "Rewards", icon: Gift },
  { href: "/admin/news", label: "News & offers", short: "News", icon: Newspaper },
  { href: "/admin/gallery", label: "Gallery", short: "Gallery", icon: Images },
  { href: "/admin/content", label: "Page content", short: "Pages", icon: FileText },
  { href: "/admin/website", label: "Website", short: "Site", icon: Globe },
  { href: "/admin/services", label: "Services", short: "Services", icon: Layers },
  { href: "/admin/website-images", label: "Website images", short: "Images", icon: ImageIcon },
];
/** Phones show the first four tabs; the rest sit behind "More". */
const PRIMARY = TABS.slice(0, 4);
const MORE = TABS.slice(4);

function useActive() {
  const pathname = usePathname();
  // "/admin/website" must not light up on "/admin/website-images"
  return (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
}

/** Vertical navigation for the desktop sidebar. */
export function SidebarNav() {
  const isActive = useActive();
  return (
    <nav className="space-y-1">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              active ? "bg-brand text-ink shadow-sm" : "text-white/65 hover:bg-white/[0.07] hover:text-white"
            }`}
          >
            <Icon className={`h-[18px] w-[18px] ${active ? "" : "text-white/45 group-hover:text-white/80"}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** App-style bottom tab bar for phones and tablets. */
export function BottomTabs() {
  const isActive = useActive();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const moreActive = MORE.some((t) => isActive(t.href));
  const item = (active: boolean) => `flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold ${active ? "text-ink" : "text-ink/45"}`;
  const pill = (active: boolean) => `inline-flex h-8 w-11 items-center justify-center rounded-full transition ${active ? "bg-brand" : ""}`;

  return (
    <>
      {open && <button aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-ink/30 backdrop-blur-[1px] lg:hidden" />}
      <nav
        aria-label="Admin sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {open && (
          <div id="admin-more" className="mx-auto grid max-w-xl grid-cols-2 gap-2 border-b border-ink/10 p-3">
            {MORE.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-3 text-sm font-semibold ${isActive(href) ? "bg-brand text-ink" : "bg-ink/[0.04] text-ink/75"}`}
              >
                <Icon className="h-5 w-5" /> {label}
              </Link>
            ))}
          </div>
        )}
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {PRIMARY.map(({ href, short: label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={item(active)}>
                <span className={pill(active)}>
                  <Icon className="h-5 w-5" />
                </span>
                {label}
              </Link>
            );
          })}
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="admin-more" className={item(moreActive || open)}>
            <span className={pill(moreActive)}>
              <MoreHorizontal className="h-5 w-5" />
            </span>
            More
          </button>
        </div>
      </nav>
    </>
  );
}
