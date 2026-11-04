"use server";

import { invalidate } from "@/lib/invalidate";
import { refresh } from "next/cache";
import { getImageChoices } from "@/lib/content/store";
import { ICONS } from "@/lib/icons";
import { requireAdmin } from "@/lib/session";
import { createService, deleteService, readServices, reorderServices, saveService, SERVICES_TAG } from "@/lib/services";

export type ServiceFormState = { saved?: boolean; error?: string; fieldErrors?: Record<string, string> };

/** "Title | text" per line → [{ title, text }] (a line without "|" is a title only). */
function pairs(raw: string, max: number) {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max)
    .map((l) => {
      const i = l.indexOf("|");
      return i === -1 ? { title: l.slice(0, 80), text: "" } : { title: l.slice(0, i).trim().slice(0, 80), text: l.slice(i + 1).trim().slice(0, 300) };
    });
}

const changed = () => {
  invalidate(SERVICES_TAG);
  refresh();
};

export async function saveServiceAction(slug: string, _prev: ServiceFormState, fd: FormData): Promise<ServiceFormState> {
  await requireAdmin();
  const [services, images] = await Promise.all([readServices(), getImageChoices()]);
  if (!services.some((x) => x.slug === slug)) return { error: "This service no longer exists." };
  const slots = new Set(images.map((i) => i.slot));
  const s = (k: string) => String(fd.get(k) ?? "").trim();
  const errors: Record<string, string> = {};
  const need = (k: string, label: string, max: number) => {
    const v = s(k);
    if (!v) errors[k] = `${label} is required.`;
    else if (v.length > max) errors[k] = `Keep it under ${max} characters.`;
  };
  need("name", "Name", 40);
  need("tag", "Short label", 24);
  need("summary", "Summary", 200);
  need("headline", "Page headline", 80);
  need("intro", "Page intro", 500);
  const features = pairs(s("features"), 6);
  const steps = pairs(s("steps"), 6);
  const faqs = pairs(s("faqs"), 10).map(({ title, text }) => ({ q: title, a: text }));
  if (!features.length) errors.features = "Add at least one line.";
  if (!steps.length) errors.steps = "Add at least one step.";
  if (faqs.some((f) => !f.a)) errors.faqs = 'Write each question as "Question | Answer".';
  if (s("whatsapp").length > 400) errors.whatsapp = "Keep it under 400 characters.";
  const iconName = s("icon");
  if (!ICONS[iconName]) errors.icon = "Pick an icon from the list.";
  const image = s("image") || null;
  if (image && !slots.has(image)) errors.image = "Pick a photo from the list.";
  const gallery = [...new Set(fd.getAll("gallery").map(String))].filter((g) => slots.has(g)).slice(0, 12);
  if (Object.keys(errors).length) return { error: "Please fix the highlighted fields.", fieldErrors: errors };

  await saveService(slug, {
    name: s("name"),
    tag: s("tag"),
    summary: s("summary"),
    headline: s("headline"),
    intro: s("intro"),
    features,
    steps,
    faqs,
    whatsapp: String(fd.get("whatsapp") ?? "").replace(/\r/g, "").trim(),
    iconName,
    image,
    gallery,
    viaNepcab: fd.get("viaNepcab") === "on",
  });
  changed();
  return { saved: true };
}

/** Lower-case words joined by dashes: "EV Charging!" → "ev-charging". */
const toSlug = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

export async function createServiceAction(_prev: ServiceFormState, fd: FormData): Promise<ServiceFormState> {
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  const slug = toSlug(String(fd.get("slug") ?? "").trim() || name);
  if (!name || name.length > 40) return { error: "Give the service a name (up to 40 characters).", fieldErrors: { name: "Required." } };
  if (slug.length < 2) return { error: "The web address needs at least 2 letters or numbers.", fieldErrors: { slug: "Too short." } };
  if (!(await createService(slug, name))) return { error: `A service at /services/${slug} already exists.`, fieldErrors: { slug: "Already used." } };
  changed();
  return { saved: true };
}

export async function deleteServiceAction(slug: string): Promise<void> {
  await requireAdmin();
  await deleteService(slug);
  changed();
}

/** Moves a service one place up (-1) or down (+1). */
export async function moveServiceAction(slug: string, by: -1 | 1): Promise<void> {
  await requireAdmin();
  const slugs = (await readServices()).map((s) => s.slug);
  const i = slugs.indexOf(slug);
  const j = i + by;
  if (i === -1 || j < 0 || j >= slugs.length) return;
  [slugs[i], slugs[j]] = [slugs[j], slugs[i]];
  await reorderServices(slugs);
  changed();
}
