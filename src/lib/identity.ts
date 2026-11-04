import "server-only";
import type { Identity } from "./messages";
import { getSiteContent } from "./site-content";

/** Company name, city, service area and office phone from admin → Website. */
export async function getIdentity(): Promise<Identity> {
  const { company, contact } = await getSiteContent();
  return { company: company.name, city: company.city, area: company.serviceArea, phone: contact.phone };
}
