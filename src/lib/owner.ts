import crypto from "node:crypto";
import { cookies } from "next/headers";

/**
 * Drafting a change costs real money per click, so while Codarc is pre-launch
 * it can be locked to its owner.
 *
 * Set CODARC_OWNER_KEY and only someone who has unlocked with it may draft.
 * Leave it unset and drafting is open to everyone — which is what you want
 * once customers are paying.
 */

export function lockEnabled() {
  return Boolean(process.env.CODARC_OWNER_KEY);
}

/** Constant-time compare so the key can't be guessed a character at a time. */
export function keyMatches(candidate: string) {
  const secret = process.env.CODARC_OWNER_KEY;
  if (!secret) return false;

  const a = Buffer.from(candidate);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function isOwner() {
  if (!lockEnabled()) return true;
  const cookie = (await cookies()).get("codarc-owner")?.value;
  return Boolean(cookie && keyMatches(cookie));
}
