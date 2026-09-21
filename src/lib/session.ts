import { cookies } from "next/headers";
import { hasEnv } from "@/lib/env";
import {
  MAX_AGE_DAYS,
  SESSION_COOKIE,
  seal,
  unseal,
  type User,
} from "@/lib/session-token";

/**
 * Who is signed in.
 *
 * Deliberately no database. The identity is signed into a cookie with HMAC,
 * so the server can trust it without storing anything — which means no
 * hosting bill and nothing to set up. When billing arrives, Stripe holds the
 * subscription and we look it up by `id`, so this still holds up.
 */

export { seal, unseal, type User };

export async function currentUser(): Promise<User | null> {
  if (!hasEnv("SESSION_SECRET")) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? unseal(token) : null;
}

export const sessionCookie = {
  name: SESSION_COOKIE,
  options: {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
  },
};

export function canSignIn() {
  return (
    hasEnv("GITHUB_APP_CLIENT_ID") &&
    hasEnv("GITHUB_APP_CLIENT_SECRET") &&
    hasEnv("SESSION_SECRET")
  );
}
