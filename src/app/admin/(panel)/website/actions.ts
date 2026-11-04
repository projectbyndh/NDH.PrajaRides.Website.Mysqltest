"use server";

import { invalidate } from "@/lib/invalidate";
import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { saveSiteContent, SITE_CONTENT_TAG, type SiteContent } from "@/lib/site-content";
import { normalizePhone, type FieldErrors } from "@/lib/validation";

export type WebsiteState = { saved?: boolean; error?: string; fieldErrors?: FieldErrors };

const URL_RE = /^https:\/\/[^\s]+$/;
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function saveWebsiteAction(_prev: WebsiteState, fd: FormData): Promise<WebsiteState> {
  await requireAdmin();
  const errors: FieldErrors = {};
  const need = (k: string, max: number, label: string) => {
    const v = s(fd, k);
    if (!v) errors[k] = `${label} is required.`;
    else if (v.length > max) errors[k] = `Keep it under ${max} characters.`;
    return v;
  };
  const opt = (k: string, max: number) => {
    const v = s(fd, k);
    if (v.length > max) errors[k] = `Keep it under ${max} characters.`;
    return v;
  };
  const url = (k: string, required = false) => {
    const v = s(fd, k);
    if (!v && required) errors[k] = "Link is required.";
    else if (v && !URL_RE.test(v)) errors[k] = "Use a full link starting with https://";
    return v;
  };

  const announcementOn = fd.get("announcementEnabled") === "on";
  const announcementText = opt("announcementText", 160);
  if (announcementOn && !announcementText) errors.announcementText = "Write the announcement, or turn it off.";
  const announcementLink = s(fd, "announcementLink");
  if (announcementLink && !/^(\/|https:\/\/)\S*$/.test(announcementLink)) errors.announcementLink = "Use a page like /drive or a full https:// link.";

  const phone = s(fd, "phone");
  if (!normalizePhone(phone)) errors.phone = "Enter a 10-digit Nepali mobile number.";
  const tollFree = s(fd, "tollFree");
  if (!/^\d{6,15}$/.test(tollFree)) errors.tollFree = "Digits only, 6–15.";
  const email = s(fd, "email");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Enter a valid email address, or leave it empty.";

  const qs = fd.getAll("faqQ").map((v) => String(v).trim());
  const as = fd.getAll("faqA").map((v) => String(v).trim());
  const faqs = qs.map((q, i) => ({ q, a: as[i] ?? "" })).filter((f) => f.q || f.a);
  faqs.forEach((f, i) => {
    if (!f.q || !f.a) errors[`faq${i}`] = "Each FAQ needs a question and an answer.";
    else if (f.q.length > 150 || f.a.length > 600) errors[`faq${i}`] = "Question max 150, answer max 600 characters.";
  });
  if (faqs.length > 12) errors.faqs = "Up to 12 questions.";

  // About Praja Ride
  const story = s(fd, "aboutStory").split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (!story.length) errors.aboutStory = "Write at least one paragraph.";
  else if (story.length > 8 || story.some((p) => p.length > 900)) errors.aboutStory = "Up to 8 paragraphs, 900 characters each.";
  const founded = s(fd, "founded");
  if (founded && !/^(19|20)\d{2}$/.test(founded) && !/^20[6-9]\d( B\.?S\.?)?$/i.test(founded)) errors.founded = "A year, e.g. 2025 (or 2082 BS).";
  const milestones = fd.getAll("msTitle").map((t, i) => ({
    date: String(fd.getAll("msDate")[i] ?? "").trim(),
    title: String(t).trim(),
    text: String(fd.getAll("msText")[i] ?? "").trim(),
    i,
  })).filter((m) => m.title || m.text || m.date);
  milestones.forEach(({ i, ...m }) => {
    if (!m.title) errors[`ms${i}`] = "Each milestone needs a title.";
    else if (m.title.length > 80 || m.text.length > 300 || m.date.length > 30) errors[`ms${i}`] = "Date max 30, title max 80, text max 300 characters.";
  });
  if (milestones.length > 12) errors.milestones = "Up to 12 milestones.";
  const team = fd.getAll("teamName").map((n, i) => ({ name: String(n).trim(), role: String(fd.getAll("teamRole")[i] ?? "").trim(), i })).filter((t) => t.name || t.role);
  team.forEach(({ i, ...t }) => {
    if (!t.name || !t.role) errors[`team${i}`] = "Add both a name and a role.";
    else if (t.name.length > 60 || t.role.length > 60) errors[`team${i}`] = "Keep name and role under 60 characters.";
  });
  if (team.length > 16) errors.team = "Up to 16 people.";

  // Rows posted as repeated fields; blank rows are dropped, errors use the row's position.
  const rows = <K extends string>(keys: K[]) =>
    fd.getAll(keys[0]).map((_, i) => ({ i, ...(Object.fromEntries(keys.map((k) => [k, String(fd.getAll(k)[i] ?? "").trim()])) as Record<K, string>) }))
      .filter((r) => keys.some((k) => r[k]));

  const testimonials = rows(["tQuote", "tName", "tRole", "tPlace"]);
  testimonials.forEach((t) => {
    if (!t.tQuote || !t.tName) errors[`t${t.i}`] = "Each testimonial needs the quote and the person's name.";
    else if (t.tQuote.length > 400 || t.tName.length > 60 || t.tRole.length > 40 || t.tPlace.length > 40) errors[`t${t.i}`] = "Quote max 400; name max 60; role and place max 40 characters.";
  });
  if (testimonials.length > 12) errors.testimonials = "Up to 12 testimonials.";

  const jobs = rows(["jobTitle", "jobType", "jobLocation", "jobText"]);
  jobs.forEach((j) => {
    if (!j.jobTitle || !j.jobText) errors[`job${j.i}`] = "Each opening needs a title and a description.";
    else if (j.jobTitle.length > 80 || j.jobType.length > 30 || j.jobLocation.length > 40 || j.jobText.length > 800) errors[`job${j.i}`] = "Title max 80, type max 30, location max 40, description max 800 characters.";
  });
  if (jobs.length > 10) errors.jobs = "Up to 10 openings.";

  const content: SiteContent = {
    company: { name: need("companyName", 60, "Company name"), city: need("city", 40, "City"), serviceArea: need("serviceArea", 80, "Service area") },
    announcement: { enabled: announcementOn, text: announcementText, link: announcementLink },
    // The home hero is edited in admin → Page content → Home (slides); kept here for old data only
    hero: { line1: s(fd, "heroLine1"), line2: s(fd, "heroLine2"), subtitle: s(fd, "heroSubtitle") },
    contact: { phone: normalizePhone(phone) ?? phone, tollFree, email: email.toLowerCase(), address: need("address", 120, "Address"), hours: opt("hours", 80) },
    social: { facebook: url("facebook", true), tiktok: url("tiktok", true), instagram: url("instagram"), google: url("google") },
    faqs,
    about: {
      story,
      mission: need("mission", 300, "Mission"),
      vision: need("vision", 300, "Vision"),
      founded,
      registrationNo: opt("registrationNo", 40),
      panNo: opt("panNo", 20),
      milestones: milestones.map(({ date, title, text }) => ({ date, title, text })),
      team: team.map(({ name, role }) => ({ name, role })),
    },
    testimonials: testimonials.map((t) => ({ quote: t.tQuote, name: t.tName, role: t.tRole, place: t.tPlace })),
    jobs: jobs.map((j) => ({ title: j.jobTitle, type: j.jobType, location: j.jobLocation, description: j.jobText })),
  };

  if (Object.keys(errors).length) return { error: "Please fix the highlighted fields.", fieldErrors: errors };
  await saveSiteContent(content);
  invalidate(SITE_CONTENT_TAG); // the public site shows the change on the next visit
  refresh(); // re-render this editor with the saved values
  return { saved: true };
}
