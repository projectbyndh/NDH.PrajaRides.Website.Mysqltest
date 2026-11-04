import { BarChart3, Gift, QrCode } from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { BRAND } from "@/lib/config";
import { getIdentity } from "@/lib/identity";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Admin sign in" };

export default async function LoginPage() {
  const who = await getIdentity();
  return (
    <main className="grid flex-1 bg-[#f6f5f0] lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-brand p-12 lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-white/25 blur-3xl" />
        <div className="flex items-center gap-3">
          <LogoMark className="h-14 w-14" />
          <div className="leading-tight">
            <p className="text-2xl font-extrabold">NEPCAB</p>
            <p className="font-deva font-bold">{BRAND.tagline}</p>
          </div>
        </div>
        <div className="mt-auto max-w-md">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight">Every ride starts with a scan.</h2>
          <p className="mt-3 text-ink/70">Track driver referrals, print QR stickers and reward your best drivers — all in one place.</p>
          <ul className="mt-8 space-y-3 text-sm font-semibold">
            {[
              { icon: QrCode, text: "One QR per driver, works on Android and iPhone" },
              { icon: BarChart3, text: "Live scans, store taps and qualified referrals" },
              { icon: Gift, text: "Monthly targets with automatic rewards" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/60">
                  <Icon className="h-4 w-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-12 text-xs text-ink/60">
          {who.city} · {who.company}
        </p>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <LogoMark className="h-12 w-12" />
            <p className="text-xl font-extrabold">NEPCAB</p>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Welcome back</h1>
          <p className="mb-8 mt-1 text-sm text-ink/55">Sign in to the referral dashboard.</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
