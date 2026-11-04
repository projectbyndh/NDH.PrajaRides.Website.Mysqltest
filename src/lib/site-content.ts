import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { BRAND } from "./config";
import { sql } from "./db";

// Website text that the admin can edit at /admin/website. Anything not saved yet falls back to
// these defaults, so the site always renders even with an empty (or unreachable) database.

export type Faq = { q: string; a: string };
export type Milestone = { date: string; title: string; text: string };
export type TeamMember = { name: string; role: string };
/** A real quote from a rider or driver partner (shown only when the admin adds some). */
export type Testimonial = { quote: string; name: string; role: string; place: string };
export type JobOpening = { title: string; type: string; location: string; description: string };

export type AboutContent = {
  /** Paragraphs of the company story. */
  story: string[];
  mission: string;
  vision: string;
  founded: string;
  registrationNo: string;
  panNo: string;
  milestones: Milestone[];
  team: TeamMember[];
};

/** Who runs the site: used in page text placeholders ({company}, {city}, {area}), the QR sticker,
 * shared messages, the driver portal and Google's business data. */
export type CompanyIdentity = { name: string; city: string; serviceArea: string };

export type SiteContent = {
  company: CompanyIdentity;
  announcement: { enabled: boolean; text: string; link: string };
  hero: { line1: string; line2: string; subtitle: string };
  contact: { phone: string; tollFree: string; email: string; address: string; hours: string };
  social: { facebook: string; tiktok: string; instagram: string; google: string };
  faqs: Faq[];
  about: AboutContent;
  testimonials: Testimonial[];
  jobs: JobOpening[];
};

export const DEFAULT_CONTENT: SiteContent = {
  company: { name: BRAND.company, city: BRAND.city, serviceArea: BRAND.serviceArea },
  announcement: { enabled: false, text: "", link: "" },
  hero: {
    line1: `Your ride in ${BRAND.city},`,
    line2: "a tap away.",
    subtitle: "Book a car or bike in the NepCab app, with local drivers checked by our office.",
  },
  contact: { phone: BRAND.whatsapp, tollFree: BRAND.tollFree, email: BRAND.email, address: BRAND.office, hours: "" },
  social: { facebook: BRAND.facebookUrl, tiktok: BRAND.tiktokUrl, instagram: "", google: "" },
  faqs: [
    { q: "What services does Praja Ride offer?", a: "Ride sharing, vehicle rental, offline booking, buying and selling vehicles, an EV charging station and a driving trial center, all from one office and one phone number." },
    { q: "What is the relationship between Praja Ride and NepCab?", a: `Our ride sharing runs on the NepCab app: ${BRAND.company} is the official NepCab franchise for ${BRAND.city}. Our other services (rentals, buy & sell, charging, trial center) are Praja Ride's own.` },
    { q: "How do I book a ride?", a: "Download NepCab from Google Play or the App Store, sign up with your mobile number, set your destination and book a car or a bike." },
    { q: "Can I book without the app?", a: `Yes. Call or WhatsApp ${BRAND.whatsapp} with your pickup, drop-off and time, or walk in at our office in Tilottama-5, ${BRAND.city}, and we book the ride for you.` },
    { q: "Is NepCab available on iPhone?", a: "Yes, NepCab is available on both Android (Google Play) and iPhone (App Store)." },
    { q: "How do I become a driver?", a: "Apply on our Drive with us page. Our office will call you to check your documents and get you started." },
    { q: "How can I contact you?", a: `Call or WhatsApp ${BRAND.whatsapp}, call the toll-free number ${BRAND.tollFree}, or use the form on our Contact page.` },
  ],
  // Only verified facts by default; the admin adds founding year, registration, team, dates.
  about: {
    story: [
      `${BRAND.company} is a ${BRAND.city} company for everything on wheels: ride sharing, vehicle rental, offline booking, buying and selling vehicles, EV charging and a driving trial center.`,
      `Our ride sharing runs on NepCab, a Nepali ride-hailing app that already serves Nepalgunj: we are its official franchise for ${BRAND.city}, and bring it to ${BRAND.serviceArea}.`,
      `Our work is local. We recruit and support driver partners, look after customers, and run every service from our office in Tilottama-5, ${BRAND.city}.`,
      "Every driver partner is also an ambassador for NepCab: each carries a personal QR code, and drivers who bring new riders to the app earn monthly rewards.",
    ],
    mission: `Be the one trusted name for everything on wheels in ${BRAND.serviceArea}, while creating good local work.`,
    vision: "A well-connected Rupandehi, where a reliable ride is always a tap away.",
    founded: "",
    registrationNo: "",
    panNo: "",
    milestones: [
      { date: "", title: "NepCab in Nepalgunj", text: "NepCab runs its ride-hailing service in Nepalgunj." },
      { date: "", title: `Franchise for ${BRAND.city}`, text: `${BRAND.company} becomes the official NepCab franchise for ${BRAND.city}.` },
      { date: "", title: `Launch in ${BRAND.serviceArea}`, text: "Rides, pool, intercity, bidding, rentals and electric become available through the NepCab app." },
      { date: "", title: "Driver partner program", text: "Driver partners receive personal QR codes and earn monthly referral rewards." },
    ],
    team: [],
  },
  testimonials: [],
  jobs: [],
};

export const SITE_CONTENT_TAG = "site-content";

/** Merges saved content over the defaults (field by field, so new fields get sensible values). */
function merge(saved: Partial<SiteContent> | null | undefined): SiteContent {
  const s = saved ?? {};
  return {
    company: { ...DEFAULT_CONTENT.company, ...s.company },
    announcement: { ...DEFAULT_CONTENT.announcement, ...s.announcement },
    hero: { ...DEFAULT_CONTENT.hero, ...s.hero },
    contact: { ...DEFAULT_CONTENT.contact, ...s.contact },
    social: { ...DEFAULT_CONTENT.social, ...s.social },
    faqs: Array.isArray(s.faqs) && s.faqs.length ? s.faqs : DEFAULT_CONTENT.faqs,
    about: {
      ...DEFAULT_CONTENT.about,
      ...s.about,
      story: Array.isArray(s.about?.story) && s.about.story.length ? s.about.story : DEFAULT_CONTENT.about.story,
      milestones: Array.isArray(s.about?.milestones) ? s.about.milestones : DEFAULT_CONTENT.about.milestones,
      team: Array.isArray(s.about?.team) ? s.about.team : DEFAULT_CONTENT.about.team,
    },
    testimonials: Array.isArray(s.testimonials) ? s.testimonials : [],
    jobs: Array.isArray(s.jobs) ? s.jobs : [],
  };
}

/** Cached site content; refreshed instantly when the admin saves (updateTag). */
export async function getSiteContent(): Promise<SiteContent> {
  "use cache";
  cacheTag(SITE_CONTENT_TAG);
  cacheLife("days");
  try {
    const q = await sql();
    const [row] = await q`SELECT content FROM site_settings WHERE id = 1`;
    if (!row) {
      // First run on a new database: store the starting content, so everything is edited from the database
      await q`INSERT INTO site_settings (id, content, updated_at) VALUES (1, ${q.json(DEFAULT_CONTENT as never)}, now()) ON CONFLICT (id) DO NOTHING`;
      return DEFAULT_CONTENT;
    }
    return merge(row.content as Partial<SiteContent>);
  } catch (err) {
    console.error("[site-content] using defaults:", err);
    return DEFAULT_CONTENT;
  }
}

/** Uncached read for the admin editor. */
export async function readSiteContent(): Promise<SiteContent> {
  const q = await sql();
  const [row] = await q`SELECT content FROM site_settings WHERE id = 1`;
  return merge(row?.content as Partial<SiteContent> | undefined);
}

export async function saveSiteContent(content: SiteContent): Promise<void> {
  const q = await sql();
  await q`
    INSERT INTO site_settings (id, content, updated_at) VALUES (1, ${q.json(content as never)}, now())
    ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, updated_at = now()`;
}
