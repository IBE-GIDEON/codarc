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

export function db(): SupabaseClient {
  if (!client) {
    client = createClient(env("SUPABASE_URL")!, env("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
