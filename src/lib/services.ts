import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { DEFAULT_ICON_NAMES, NEPCAB_LINK, PRAJA_SERVICES, type ServiceData } from "@/components/site/brand-services";
import { sql } from "./db";
import { SERVICE_GALLERY } from "./site-images";

// Services from the database (services table): created, edited, reordered and removed in
// /admin/services. A new database gets the starting six from brand-services.ts on first read.

export const SERVICES_TAG = "services";

type Item = { title: string; text: string };
type Faq = { q: string; a: string };

const slotOf = (src: string) => src.replace(/^\/media\/site\//, "");

const defaults = (): ServiceData[] =>
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  PRAJA_SERVICES.map(({ icon, ...rest }) => ({
    ...rest,
    iconName: DEFAULT_ICON_NAMES[rest.slug] ?? "car",
    image: `service-${rest.slug}`,
    gallery: (SERVICE_GALLERY[rest.slug] ?? []).map((g) => slotOf(g.src)),
  }));

const COLUMNS = "slug, name, tag, summary, headline, intro, features, steps, faqs, whatsapp, icon, via_nepcab, image, gallery";

function toService(r: Record<string, unknown>): ServiceData {
  return {
    slug: r.slug as string,
    name: r.name as string,
    tag: r.tag as string,
    summary: r.summary as string,
    headline: r.headline as string,
    intro: r.intro as string,
    features: r.features as Item[],
    steps: r.steps as Item[],
    faqs: r.faqs as Faq[],
    whatsapp: r.whatsapp as string,
    iconName: (r.icon as string) || "car",
    image: (r.image as string) || null,
    gallery: Array.isArray(r.gallery) ? (r.gallery as string[]) : [],
    poweredBy: r.via_nepcab ? NEPCAB_LINK : undefined,
  };
}

/** Every service in display order (cached until a service changes). */
export async function getServices(): Promise<ServiceData[]> {
  "use cache";
  cacheTag(SERVICES_TAG);
  cacheLife("days");
  try {
    return await readServices();
  } catch (err) {
    console.error("[services] using starting services:", err);
    return defaults();
  }
}

/** Uncached read (admin), storing the starting services on a new database. */
export async function readServices(): Promise<ServiceData[]> {
  const q = await sql();
  let rows = await q.unsafe(`SELECT ${COLUMNS} FROM services ORDER BY sort, created_at`);
  if (!rows.length) {
    for (const [i, s] of defaults().entries()) await insertService(s, i);
    rows = await q.unsafe(`SELECT ${COLUMNS} FROM services ORDER BY sort, created_at`);
  }
  return rows.map((r) => toService(r as Record<string, unknown>));
}

export async function getService(slug: string): Promise<ServiceData | null> {
  return (await getServices()).find((s) => s.slug === slug) ?? null;
}

async function insertService(s: ServiceData, sort: number): Promise<void> {
  const q = await sql();
  await q`
    INSERT INTO services (slug, sort, name, tag, summary, headline, intro, features, steps, faqs, whatsapp, icon, via_nepcab, image, gallery)
    VALUES (${s.slug}, ${sort}, ${s.name}, ${s.tag}, ${s.summary}, ${s.headline}, ${s.intro},
            ${q.json(s.features as never)}, ${q.json(s.steps as never)}, ${q.json(s.faqs as never)}, ${s.whatsapp},
            ${s.iconName}, ${!!s.poweredBy}, ${s.image}, ${q.json(s.gallery as never)})
    ON CONFLICT (slug) DO NOTHING`;
}

export type ServiceInput = Omit<ServiceData, "slug" | "poweredBy"> & { viaNepcab: boolean };

export async function saveService(slug: string, s: ServiceInput): Promise<void> {
  const q = await sql();
  await q`
    UPDATE services SET name = ${s.name}, tag = ${s.tag}, summary = ${s.summary}, headline = ${s.headline}, intro = ${s.intro},
      features = ${q.json(s.features as never)}, steps = ${q.json(s.steps as never)}, faqs = ${q.json(s.faqs as never)},
      whatsapp = ${s.whatsapp}, icon = ${s.iconName}, via_nepcab = ${s.viaNepcab}, image = ${s.image},
      gallery = ${q.json(s.gallery as never)}, updated_at = now()
    WHERE slug = ${slug}`;
}

/** Adds a new service at the end (a placeholder page to fill in). Returns false if the slug is taken. */
export async function createService(slug: string, name: string): Promise<boolean> {
  const q = await sql();
  const [{ n }] = await q`SELECT COALESCE(MAX(sort), -1) + 1 AS n FROM services`;
  const res = await q`
    INSERT INTO services (slug, sort, name, tag, summary, headline, intro, features, steps, faqs, whatsapp, icon)
    VALUES (${slug}, ${n}, ${name}, ${name}, ${`${name} from Praja Ride.`}, ${name}, ${`${name} from Praja Ride.`},
            ${q.json([{ title: "What you get", text: "Describe this service." }] as never)},
            ${q.json([{ title: "Get in touch", text: "Call or WhatsApp our office." }] as never)}, '[]'::jsonb,
            ${`Hello Praja Ride, I'd like to know more about ${name}.`}, 'star')
    ON CONFLICT (slug) DO NOTHING`;
  return res.count > 0;
}

export async function deleteService(slug: string): Promise<void> {
  const q = await sql();
  await q`DELETE FROM services WHERE slug = ${slug}`;
}

/** Saves a new display order (slugs in order). */
export async function reorderServices(slugs: string[]): Promise<void> {
  const q = await sql();
  await q.begin(async (tx) => {
    for (const [i, slug] of slugs.entries()) await tx`UPDATE services SET sort = ${i} WHERE slug = ${slug}`;
  });
}
