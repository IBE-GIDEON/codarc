import "server-only";
import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * Live cursors are Studio-only, and the browser talks to Supabase Realtime
 * directly — so access control is the channel name itself.
 *
 * It's an HMAC of the team and the repository: impossible to guess, and only
 * ever handed out by the server to someone with a live Studio entitlement.
 * Everyone on one team viewing one repo lands in the same room; nobody else
 * can find it.
 */
export function presenceChannel(billingId: number, repo: string): string {
  const secret = env("SESSION_SECRET");
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const digest = crypto
    .createHmac("sha256", secret)
    .update(`codarc-presence:${billingId}:${repo.trim().toLowerCase()}`)
    .digest("base64url")
    .slice(0, 24);
  return `map-${digest}`;
}

export function canPresence() {
  return Boolean(env("SUPABASE_URL") && env("SUPABASE_ANON_KEY") && env("SESSION_SECRET"));
}
