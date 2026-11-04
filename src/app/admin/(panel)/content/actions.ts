"use server";

import { invalidate } from "@/lib/invalidate";
import { refresh } from "next/cache";
import { BLOCKS, isBlockKey } from "@/lib/content/blocks";
import { CONTENT_TAG, getImageChoices, saveBlock } from "@/lib/content/store";
import { cleanFields } from "@/lib/content/validate";
import { requireAdmin } from "@/lib/session";

export type BlockSaveResult = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function saveBlockAction(key: string, json: string): Promise<BlockSaveResult> {
  await requireAdmin();
  if (!isBlockKey(key)) return { ok: false, error: "Unknown section." };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "Couldn't read the form. Please try again." };
  }
  const slots = new Set((await getImageChoices()).map((c) => c.slot));
  const { data, errors } = cleanFields(BLOCKS[key].fields, raw, (s) => slots.has(s));
  if (Object.keys(errors).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errors };
  await saveBlock(key, data);
  invalidate(CONTENT_TAG);
  refresh();
  return { ok: true };
}
