import "server-only";
import { db, isDbConfigured } from "@/lib/db";
import { getAccount, upsertAccount } from "@/lib/accounts";
import { hint, open, seal } from "@/lib/secrets";
import { env } from "@/lib/env";
import type { User } from "@/lib/session";

/**
 * A customer's own Claude key.
 *
 * Drafting a change costs money on every click. Letting someone bring their
 * own key means their changes are billed to them, which is what makes a
 * cheap plan possible at all — and it's the only honest way to run this
 * before Codarc can carry the bill itself.
 *
 * The key is checked with Anthropic before it's saved, kept encrypted, and
 * never handed back: the account page shows a hint, nothing more.
 */

export type KeyCheck =
  | { ok: true; hint: string }
  | { ok: false; error: string; help: string };

/** Anthropic keys all start the same way; catch a typo before the network does. */
export function looksLikeKey(raw: unknown): raw is string {
  return typeof raw === "string" && /^sk-ant-[\w-]{20,}$/.test(raw.trim());
}

/** Asks Anthropic whether the key works, so nobody saves a dud. */
export async function checkWithAnthropic(key: string): Promise<KeyCheck> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      cache: "no-store",
    });
    if (res.ok) return { ok: true, hint: hint(key) };
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error: "Anthropic didn't accept that key",
        help: "Copy it again from console.anthropic.com — keys are only shown once, so it's easy to grab a partial one.",
      };
    }
    return {
      ok: false,
      error: "Anthropic didn't answer",
      help: "Nothing was saved. Try again in a moment.",
    };
  } catch {
    return {
      ok: false,
      error: "We couldn't reach Anthropic",
      help: "Check your connection and try again.",
    };
  }
}

export async function saveClaudeKey(user: Omit<User, "at">, key: string) {
  if (!isDbConfigured()) {
    return { message: "The database isn't connected." };
  }
  const failure = await upsertAccount(user);
  if (failure) return failure;

  const { error } = await db()
    .from("accounts")
    .update({
      claude_key: seal(key.trim()),
      claude_key_hint: hint(key.trim()),
      updated_at: new Date().toISOString(),
    })
    .eq("github_id", user.id);
  if (error) console.error("[claude key] save", error.code ?? "", error.message);
  return error;
}

export async function removeClaudeKey(user: Omit<User, "at">) {
  if (!isDbConfigured()) return null;
  const { error } = await db()
    .from("accounts")
    .update({ claude_key: null, claude_key_hint: null })
    .eq("github_id", user.id);
  if (error) console.error("[claude key] remove", error.code ?? "", error.message);
  return error;
}

/** What the account page shows: a hint, never the key. */
export async function claudeKeyHint(githubId: number): Promise<string | null> {
  const account = await getAccount(githubId);
  return (account as { claude_key_hint?: string | null } | null)?.claude_key_hint ?? null;
}

/**
 * The key to draft with, for this person: their own, else the one belonging
 * to whoever pays for their plan, else Codarc's own if it has one.
 */
export async function keyForDrafting(
  userId: number,
  billingId: number | null,
): Promise<string | null> {
  for (const id of [userId, billingId]) {
    if (!id) continue;
    const account = await getAccount(id);
    const sealed = (account as { claude_key?: string | null } | null)?.claude_key;
    if (sealed) {
      const key = open(sealed);
      if (key) return key;
    }
  }
  return env("ANTHROPIC_API_KEY") ?? null;
}
