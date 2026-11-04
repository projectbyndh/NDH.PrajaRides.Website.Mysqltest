import type { Metadata, Viewport } from "next";
import { Inter, Mukta, Plus_Jakarta_Sans, Poppins } from "next/font/google";
import { IdentityProvider } from "@/components/IdentityProvider";
import { getIdentity } from "@/lib/identity";
import { SITE_ORIGIN } from "@/lib/site-url";
import "./globals.css";

// Admin, driver portal and download pages keep Poppins (NepCab's logo face).
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Praja Ride website type system:
//   Plus Jakarta Sans  headings, labels, buttons (sharp, modern geometric)
//   Inter              body text (built for screens, clear at small sizes)
//   Mukta              Nepali (Devanagari) text such as the tagline
const display = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const body = Inter({ variable: "--font-inter", subsets: ["latin"] });

const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["devanagari"],
  weight: ["600", "700"],
});

// Absolute base for link previews (og:image).

export async function generateMetadata(): Promise<Metadata> {
  const { company, city } = await getIdentity();
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: { default: `Praja Ride — Everything on wheels in ${city}`, template: "%s | Praja Ride" },
    description: `${company}, ${city}: ride sharing, vehicle rental, offline booking, vehicle buy & sell, EV charging and a driving trial center.`,
  };
}

export const viewport: Viewport = {
  themeColor: "#020a1f",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const identity = await getIdentity();
  // suppressHydrationWarning: the site layout adds a "js" class to <html> before hydration (scroll reveal).
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${display.variable} ${body.variable} ${mukta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <IdentityProvider value={identity}>{children}</IdentityProvider>
      </body>
    </html>
  );
}
