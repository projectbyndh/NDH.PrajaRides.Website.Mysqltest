"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import { ADMIN_COOKIE, adminToken, strongSecret } from "@/lib/auth";

export type LoginState = { error?: string; email?: string };

const sha = (s: string) => createHash("sha256").update(s).digest();
const sameText = (a: string, b: string) => timingSafeEqual(sha(a), sha(b));

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const expectedPassword = strongSecret(process.env.ADMIN_PASSWORD);
  if (!expectedEmail || !expectedPassword) return { error: "ADMIN_EMAIL and a strong ADMIN_PASSWORD (12+ characters, not the example) must be set on the server." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  // Check both every time so the response doesn't reveal which one was wrong.
  const emailOk = sameText(email, expectedEmail);
  const passwordOk = sameText(password, expectedPassword);
  if (!emailOk || !passwordOk) {
    await new Promise((r) => setTimeout(r, 800)); // slows down password guessing
    return { error: "Incorrect email or password.", email };
  }

  (await cookies()).set(ADMIN_COOKIE, (await adminToken())!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  const next = String(formData.get("next") ?? "");
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
