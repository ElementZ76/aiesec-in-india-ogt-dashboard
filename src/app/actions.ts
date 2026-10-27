"use server";
// Log in / log out (docs/sops/pool-page.md "Login"). Server actions are public endpoints, so every
// input is checked here; the password is compared inside the database and never stored or logged.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionValue, isSlug, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/session";
import { checkEntityPassword } from "@/lib/db/read";

export interface LoginState {
  error: string | null;
}

const WRONG = "Wrong password. Passwords are case-sensitive.";

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const slug = String(form.get("slug") ?? "");
  const password = String(form.get("password") ?? "");
  if (!isSlug(slug) || !password || password.length > 200) return { error: WRONG };

  const version = await checkEntityPassword(slug, password);
  if (version === null) return { error: WRONG };

  (await cookies()).set(SESSION_COOKIE, createSessionValue(slug, version, process.env.SESSION_SECRET ?? "", Date.now()), {
    httpOnly: true, // page scripts cannot read it
    secure: process.env.NODE_ENV === "production", // HTTPS only on the live site
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  redirect(`/${slug}`);
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
