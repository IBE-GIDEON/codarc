import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * The free look: Codarc draws one app for anybody, once, and asks for a plan
 * before it draws another.
 *
 * Nobody signs up for a picture they haven't seen, so the first one is on us —
 * the demo, or their own app, whichever they open first. After that the map is
 * the product, not the advert.
 *
 * It's a cookie, because the person spending it doesn't have an account yet.
 * Clearing cookies buys another look; that's the price of not putting a wall
 * at the front door, and it's cheap — one read of one repository.
 */

export const TRIAL_COOKIE = "codarc-trial";

/** Separate from the session signature so one can never stand in for the other. */
const DOMAIN = "codarc-trial:";
const MAX_AGE_DAYS = 365;

/** Same block as every other cookie here, so there's one shape to remember. */
export const trialCookie = {
  name: TRIAL_COOKIE,
  options: {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // A year: long enough that the free look is genuinely once.
    maxAge: 60 * 60 * 24 * MAX_AGE_DAYS,
  },
};

function sign(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(DOMAIN + payload).digest("base64url");
}

/**
 * Marks the free look as spent, on one repository. Returns null when there's
 * no secret to sign with — nothing is tracked then, and nobody is turned away
 * over our own missing configuration.
 */
export function spendLook(repo: string): string | null {
  const secret = env("SESSION_SECRET");
  if (!secret) return null;
  const payload = Buffer.from(JSON.stringify({ r: repo, at: Date.now() })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload, secret)}`;
}

/** The repository someone already spent their free look on, if they have. */
export function lookSpentOn(token: string | undefined): string | null {
  const secret = env("SESSION_SECRET");
  if (!token || !secret) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const { r } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof r === "string" ? r : null;
  } catch {
    return null;
  }
}

export type Look =
  | { ok: true; spend: boolean }
  | { ok: false; error: string; hint: string };

/**
 * Whether this person may open this map. A plan opens everything; without
 * one you get your free look, and going back to the same app as often as you
 * like — nobody should lose the map they're reading by refreshing it.
 */
export function mayLook({
  hasPlan,
  spentOn,
  repo,
}: {
  hasPlan: boolean;
  spentOn: string | null;
  repo: string;
}): Look {
  if (hasPlan) return { ok: true, spend: false };
  if (!spentOn) return { ok: true, spend: true };
  if (spentOn === repo) return { ok: true, spend: false };

  return {
    ok: false,
    error: "Your free look is used up",
    hint: `Codarc draws one app for free, and yours went on ${spentOn}. A plan draws as many as you like — and lets you change them, which is the part that costs us money to run.`,
  };
}
