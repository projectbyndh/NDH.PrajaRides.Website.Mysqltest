"use server";

import { headers } from "next/headers";
import { saveContactMessage } from "@/lib/contact";
import { validateContact, type FieldErrors } from "@/lib/validation";

export type ContactState = { done?: boolean; error?: string; fieldErrors?: FieldErrors; values?: Record<string, string> };

export async function contactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  if (String(formData.get("website") ?? "")) return { done: true }; // honeypot

  const values: Record<string, string> = {};
  for (const [k, v] of formData) if (typeof v === "string" && !k.startsWith("$")) values[k] = v;

  const result = validateContact(formData);
  if (!result.ok) return { error: "Please check the highlighted fields.", fieldErrors: result.errors, values };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim().slice(0, 64) ?? null;
  const saved = await saveContactMessage(result.data, ip);
  if (!saved.ok) return { error: saved.error, values };
  return { done: true };
}
