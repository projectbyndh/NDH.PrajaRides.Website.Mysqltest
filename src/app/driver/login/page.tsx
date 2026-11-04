import { BRAND } from "@/lib/config";
import { getIdentity } from "@/lib/identity";
import { LogoMark } from "@/components/Logo";
import { DriverLoginForm } from "./LoginForm";

export const metadata = { title: "Driver login" };

export default async function DriverLoginPage() {
  const who = await getIdentity();
  return (
    <main className="flex flex-1 flex-col items-center bg-brand px-5 pt-12">
      <LogoMark className="h-20 w-20 drop-shadow-md" />
      <h1 className="mt-3 text-2xl font-extrabold">Driver portal</h1>
      <p className="font-deva text-lg font-bold">{BRAND.tagline}</p>
      <p className="mt-0.5 text-sm font-medium text-ink/70">
        NepCab {who.city} · By {who.company}
      </p>
      <div className="mt-6 w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl shadow-brand-dark/40">
        <DriverLoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-ink/75">
        Forgot your PIN? Call the NepCab office
        <br />
        <a href={`tel:${who.phone}`} className="font-bold">
          {who.phone}
        </a>
      </p>
    </main>
  );
}
