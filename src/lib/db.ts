import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * The database, server-side only.
 *
 * Uses the service-role key, which bypasses Row Level Security — so this
 * module must never reach a browser bundle, and the `server-only` import
 * above makes the build fail if anyone tries. Every table has RLS on with no
 * policies, so the public anon key can read nothing even if it leaked.
 */

let client: SupabaseClient | null = null;

export function isDbConfigured() {
  return Boolean(env("SUPABASE_URL") && env("SUPABASE_SERVICE_ROLE_KEY"));
}

/**
 * Which kind of key the server was given. The public key can read nothing
 * and write nothing here, but it still connects — so without this check it
 * looks like it works right up until something tries to save.
 */
export function dbKeyKind(): "secret" | "public" | "unrecognised" | "missing" {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) return "missing";
  if (key.startsWith("sb_secret_")) return "secret";
  if (key.startsWith("sb_publishable_")) return "public";
  const [, payload] = key.split(".");
  if (!payload) return "unrecognised";
  try {
    const { role } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      role?: string;
    };
    if (role === "service_role") return "secret";
    if (role === "anon") return "public";
  } catch {}
  return "unrecognised";
}

/**
 * Turns a failed write into something a person can act on, and leaves the
 * real message in the server log for whoever runs Codarc.
 */
export function explainWriteFailure(
  where: string,
  failure: { message: string; code?: string } | null,
): { error: string; hint: string } {
  if (failure) console.error(`[db] ${where}:`, failure.code ?? "", failure.message);

  const blocked =
    dbKeyKind() === "public" ||
    failure?.code === "42501" ||
    /row-level security|permission denied/i.test(failure?.message ?? "");

  if (blocked) {
    return {
      error: "Codarc couldn't save that",
      hint: "This is a setup problem on our side, not yours. If you run Codarc: the database key in Vercel is the public one — swap SUPABASE_SERVICE_ROLE_KEY for the secret key, then redeploy.",
    };
  }
  return { error: "Codarc couldn't save that", hint: "Try again in a moment." };
}

export function db(): SupabaseClient {
  if (!client) {
    client = createClient(env("SUPABASE_URL")!, env("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
