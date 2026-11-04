"use server";

import { refresh } from "next/cache";
import { deleteContactMessage, setMessageRead } from "@/lib/contact";
import { requireAdmin } from "@/lib/session";

const isId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

export async function setMessageReadAction(id: string, read: boolean): Promise<void> {
  await requireAdmin();
  if (!isId(id)) return;
  await setMessageRead(id, read);
  refresh();
}

export async function deleteMessageAction(id: string): Promise<void> {
  await requireAdmin();
  if (!isId(id)) return;
  await deleteContactMessage(id);
  refresh();
}
