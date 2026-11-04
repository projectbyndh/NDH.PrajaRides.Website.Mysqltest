import { Suspense } from "react";
import { Download, ExternalLink, LogOut } from "lucide-react";
import { PrajaWordmark } from "@/components/PrajaLogo";
import { SubmitButton } from "@/components/SubmitButton";
import { logout } from "../actions";
import { BottomTabs, SidebarNav } from "./AdminNav";

export const metadata = { title: "Admin" };

function SignOut({ compact = false }: { compact?: boolean }) {
  return (
    <form action={logout}>
      <SubmitButton
        spinner={false}
        title="Sign out"
        className={`inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-white/60 transition hover:bg-white/[0.07] hover:text-white ${compact ? "p-2" : "px-2 py-1.5"}`}
      >
        <LogOut className="h-4 w-4" />
        {!compact && "Sign out"}
      </SubmitButton>
    </form>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  const email = process.env.ADMIN_EMAIL ?? "Admin";
  return (
    <div className="flex-1 bg-[#f6f5f0] lg:pl-64">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy px-4 py-6 lg:flex">
        <PrajaWordmark light sub="NepCab · Butwal" className="px-2" />
        <p className="mt-6 px-3 text-[11px] font-bold uppercase tracking-wider text-white/35">NepCab referral program</p>
        <div className="mt-2">
          <Suspense>
            <SidebarNav />
          </Suspense>
        </div>

        <div className="mt-6 space-y-1 border-t border-white/10 pt-4">
          {/* A file download (CSV), not a page: a plain link is right here. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/api/admin/export" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.07] hover:text-white">
            <Download className="h-4 w-4 text-white/45" /> Export CSV
          </a>
          <a href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/60 hover:bg-white/[0.07] hover:text-white">
            <ExternalLink className="h-4 w-4 text-white/45" /> View website
          </a>
        </div>

        <div className="mt-auto rounded-2xl bg-white/[0.06] p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40">Signed in as</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-white" title={email}>
            {email}
          </p>
          <div className="mt-2 -ml-2">
            <SignOut />
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-navy px-4 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] lg:hidden">
        <PrajaWordmark light sub="NepCab · Butwal" className="min-w-0 [&_svg]:h-9 [&_svg]:w-9" />
        {/* A file download (CSV), not a page: a plain link is right here. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/admin/export" className="ml-auto rounded-lg p-2 text-white/60 hover:text-white" title="Export CSV" aria-label="Export CSV">
          <Download className="h-5 w-5" />
        </a>
        <SignOut compact />
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 pb-28 pt-5 sm:space-y-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>

      <Suspense>
        <BottomTabs />
      </Suspense>
    </div>
  );
}
