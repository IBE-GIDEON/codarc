import crypto from "node:crypto";
import { cookies } from "next/headers";
import { env, hasEnv } from "@/lib/env";

/**
 * Who is signed in.
 *
 * Deliberately no database. The identity is signed into a cookie with HMAC,
 * so the server can trust it without storing anything — which means no
 * hosting bill and nothing to set up. When billing arrives, Stripe holds the
 * subscription and we look it up by `id`, so this still holds up.
 */

export type User = {
  /** GitHub's numeric user id — stable even if they rename themselves. */
  id: number;
  login: string;
  name: string | null;
  avatar: string;
  /** Issued-at, so sessions can age out. */
  at: number;
};

const COOKIE = "codarc-session";
const MAX_AGE_DAYS = 30;

function secret(): string {
  const value = env("SESSION_SECRET");
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

const b64 = (input: string | Buffer) =>
  Buffer.from(input).toString("base64url");

function sign(payload: string) {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function seal(user: Omit<User, "at">): string {
  const payload = b64(JSON.stringify({ ...user, at: Date.now() }));
  return `${payload}.${sign(payload)}`;
}

export function unseal(token: string): User | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  // Constant-time, and length-checked first so the compare can't throw.
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }

  try {
    const user = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as User;
    const age = Date.now() - user.at;
    if (age > MAX_AGE_DAYS * 24 * 60 * 60 * 1000) return null;
    return user;
  } catch {
    return null;
  }
}

export async function currentUser(): Promise<User | null> {
  if (!hasEnv("SESSION_SECRET")) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? unseal(token) : null;
}

export const sessionCookie = {
  name: COOKIE,
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
