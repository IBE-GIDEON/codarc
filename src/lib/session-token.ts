import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * The signed identity inside the session cookie, with nothing framework-side
 * attached — so the proxy can check a cookie without pulling in `next/headers`.
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

export const SESSION_COOKIE = "codarc-session";
export const MAX_AGE_DAYS = 30;

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
  if (!env("SESSION_SECRET")) return null;
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
