"use server";

import { refresh } from "next/cache";
import { deleteTier, listTiers, saveTier, setRewardStatus, type RewardStatus } from "@/lib/rewards";
import { requireAdmin } from "@/lib/session";
import { validateTier, type FieldErrors } from "@/lib/validation";

export async function setRewardStatusAction(id: string, status: RewardStatus) {
  await requireAdmin();
  if (!["pending", "paid", "cancelled"].includes(status)) return;
  await setRewardStatus(id, status);
  refresh();
}

export type TierState = { error?: string; fieldErrors?: FieldErrors; saved?: boolean; values?: Record<string, string> };

export async function saveTierAction(_prev: TierState, formData: FormData): Promise<TierState> {
  await requireAdmin();
  const values = Object.fromEntries([...formData].filter(([k, v]) => !k.startsWith("$") && typeof v === "string")) as Record<string, string>;
  const result = validateTier(formData);
  if (!result.ok) return { fieldErrors: result.errors, values };

  const id = Number(formData.get("id")) || undefined;
  const clash = (await listTiers()).find((t) => t.target === result.data.target && t.id !== id);
  if (clash) return { fieldErrors: { target: `“${clash.reward}” already uses ${clash.target}.` }, values };

  await saveTier({ id, ...result.data });
  refresh();
  return { saved: true };
}

export async function deleteTierAction(id: number) {
  await requireAdmin();
  await deleteTier(id);
  refresh();
}
