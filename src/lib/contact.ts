import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "./db";
import { bool } from "./mysql";
import type { ContactData } from "./validation";

export type ContactMessage = ContactData & { id: string; read: boolean; createdAt: Date };

export async function saveContactMessage(m: ContactData, ipAddress: string | null): Promise<{ ok: boolean; error?: string }> {
  const q = await sql();
  if (ipAddress) {
    const [{ n }] = await q`SELECT count(*) AS n FROM contact_messages WHERE ip_address = ${ipAddress} AND created_at > UTC_TIMESTAMP() - INTERVAL 1 HOUR`;
    if (Number(n) >= 5) return { ok: false, error: "Too many messages from this network. Please call or WhatsApp us instead." };
  }
  // The id has no default in the MySQL schema (Postgres used gen_random_uuid()), so it is set here.
  await q`INSERT INTO contact_messages ${q({ id: randomUUID(), ...m, ip_address: ipAddress })}`;
  return { ok: true };
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const q = await sql();
  // "read" is a reserved word in MySQL and has to be quoted.
  const rows = await q`
    SELECT id, name, phone, email, topic, message, organization, subject, \`read\`, created_at AS createdAt
    FROM contact_messages ORDER BY \`read\`, created_at DESC LIMIT 500`;
  return rows.map((r) => ({ ...r, read: bool(r.read) })) as unknown as ContactMessage[];
}

export async function countUnreadMessages(): Promise<number> {
  const q = await sql();
  // "read" is a reserved word in MySQL: unquoted it is a syntax error, and because the admin
  // dashboard awaits every one of its queries together, that one error blanked the whole page.
  const [{ n }] = await q`SELECT count(*) AS n FROM contact_messages WHERE NOT \`read\``;
  return Number(n);
}

export async function setMessageRead(id: string, read: boolean): Promise<void> {
  const q = await sql();
  await q`UPDATE contact_messages SET \`read\` = ${read} WHERE id = ${id}`;
}

export async function deleteContactMessage(id: string): Promise<void> {
  const q = await sql();
  await q`DELETE FROM contact_messages WHERE id = ${id}`;
}
