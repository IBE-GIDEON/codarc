import crypto from "node:crypto";
import { env } from "@/lib/env";

/**
 * The `state` GitHub hands back carries where to return to, plus a nonce we
 * match against a cookie so someone can't forge a sign-in round trip.
 */

export const STATE_COOKIE = "codarc-oauth-state";

export function packState(back: string) {
  const nonce = crypto.randomBytes(16).toString("base64url");
  const state = Buffer.from(JSON.stringify({ n: nonce, b: back })).toString(
    "base64url",
  );
  return { state, nonce };
}

export function unpackState(state: string | null) {
  if (!state) return null;
  try {
    const { n, b } = JSON.parse(
      Buffer.from(state, "base64url").toString("utf8"),
    ) as { n?: string; b?: string };
    if (!n) return null;
    // Only ever return to our own pages.
    const back = b && b.startsWith("/") && !b.startsWith("//") ? b : "/";
    return { nonce: n, back };
  } catch {
    return null;
  }
}

export type GithubUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
};

/** Swaps the one-time code for a token, then asks who it belongs to. */
export async function identify(code: string): Promise<GithubUser | null> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "codarc",
    },
    body: JSON.stringify({
      client_id: env("GITHUB_APP_CLIENT_ID"),
      client_secret: env("GITHUB_APP_CLIENT_SECRET"),
      code,
    }),
    cache: "no-store",
  });

  if (!res.ok) return null;
  const token = (await res.json()) as { access_token?: string };
  if (!token.access_token) return null;

  const who = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token.access_token}`,
      "User-Agent": "codarc",
    },
    cache: "no-store",
  });

  if (!who.ok) return null;
  return (await who.json()) as GithubUser;
}
