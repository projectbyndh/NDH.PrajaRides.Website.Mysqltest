"use client";

import { createContext, useContext, type ReactNode } from "react";
import { BRAND } from "@/lib/config";
import type { Identity } from "@/lib/messages";

// Company name, city and office phone from admin → Website, for components that run in the browser
// (QR sheets, WhatsApp messages, the home hero). Provided once by the root layout.

const IdentityContext = createContext<Identity>({ company: BRAND.company, city: BRAND.city, area: BRAND.serviceArea, phone: BRAND.whatsapp });

export function IdentityProvider({ value, children }: { value: Identity; children: ReactNode }) {
  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
}

export const useIdentity = () => useContext(IdentityContext);
