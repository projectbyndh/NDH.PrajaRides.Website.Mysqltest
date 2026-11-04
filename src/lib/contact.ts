import "server-only";
import { sql } from "./db";
import type { ContactData } from "./validation";

export type ContactMessage = ContactData & { id: string; read: boolean; createdAt: Date };

export async function saveContactMessage(m: ContactData, ipAddress: string | null): Promise<{ ok: boolean; error?: string }> {
  const q = await sql();
  if (ipAddress) {
    const [{ n }] = await q`SELECT count(*)::int AS n FROM contact_messages WHERE ip_address = ${ipAddress} AND created_at > now() - interval '1 hour'`;
    if (n >= 5) return { ok: false, error: "Too many messages from this network. Please call or WhatsApp us instead." };
  }
  await q`INSERT INTO contact_messages ${q({ ...m, ip_address: ipAddress })}`;
  return { ok: true };
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const q = await sql();
  const rows = await q`
    SELECT id, name, phone, email, topic, message, organization, subject, read, created_at AS "createdAt"
    FROM contact_messages ORDER BY read, created_at DESC LIMIT 500`;
  return rows as unknown as ContactMessage[];
}

export async function countUnreadMessages(): Promise<number> {
  const q = await sql();
  const [{ n }] = await q`SELECT count(*)::int AS n FROM contact_messages WHERE NOT read`;
  return n;
}

export async function setMessageRead(id: string, read: boolean): Promise<void> {
  const q = await sql();
  await q`UPDATE contact_messages SET read = ${read} WHERE id = ${id}`;
}

export async function deleteContactMessage(id: string): Promise<void> {
  const q = await sql();
  await q`DELETE FROM contact_messages WHERE id = ${id}`;
}
