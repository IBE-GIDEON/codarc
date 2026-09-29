import "server-only";
import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * Locking away something a customer handed us — their Claude key.
 *
 * Encrypted with a key derived from SESSION_SECRET, so the database alone
 * gives nothing away: someone reading a stolen table copy sees ciphertext.
 * Nothing here is ever logged or sent back to the browser.
 */

function key(): Buffer {
  const secret = env("SESSION_SECRET");
  if (!secret) throw new Error("SESSION_SECRET is not set");
  // A fixed salt is fine here: the secret is already long and random, and
  // the salt only separates this use of it from the session signature.
  return crypto.scryptSync(secret, "codarc-secrets", 32);
}

export function seal(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, body].map((b) => b.toString("base64url")).join(".");
}

export function open(sealed: string): string | null {
  try {
    const [iv, tag, body] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
    if (!iv || !tag || !body) return null;
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
  } catch {
    // A secret rotated, or a row from another deployment. Never throw here —
    // it would take a page down for something recoverable.
    return null;
  }
}

/** "sk-ant-…4f2a" — enough to recognise, useless to anyone else. */
export function hint(plain: string): string {
  return `${plain.slice(0, 7)}…${plain.slice(-4)}`;
}
