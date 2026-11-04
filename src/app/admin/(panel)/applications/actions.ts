"use server";

import { refresh } from "next/cache";
import { getApplication, markApplication } from "@/lib/applications";
import { requireAdmin } from "@/lib/session";

const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function rejectApplicationAction(id: string, note: string): Promise<{ error?: string }> {
  await requireAdmin();
  if (!isId(id) || !(await getApplication(id))) return { error: "Application not found." };
  await markApplication(id, "rejected", note.trim().slice(0, 300) || null);
  refresh();
  return {};
}

export async function reopenApplicationAction(id: string): Promise<void> {
  await requireAdmin();
  if (!isId(id)) return;
  await markApplication(id, "pending", null);
  refresh();
}
