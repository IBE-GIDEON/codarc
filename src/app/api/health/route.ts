import { NextResponse } from "next/server";
import { db, dbKeyKind, isDbConfigured } from "@/lib/db";
import { env, hasEnv, supabaseUrl } from "@/lib/env";
import { paymentsConfigured } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Is everything plugged in? Answers yes/no for each part and nothing more —
 * no counts, no rows, no key fragments. Safe to leave public, and the first
 * thing to open when something isn't working.
 */
export async function GET() {
  const tables = ["accounts", "projects", "changes", "teams", "team_members", "team_invites", "drafts"];

  let database:
    | "connected"
    | "not configured"
    | "tables missing"
    | "rejected"
    | "wrong address"
    | "wrong key — use the secret one" = "not configured";
  const missing: string[] = [];
  const keyKind = dbKeyKind();
  let accountsSaved: boolean | undefined;
  let billingColumns: boolean | undefined;

  // The public key connects fine and reads empty tables, so it would pass
  // every check below while every save quietly fails.
  if (isDbConfigured() && keyKind === "public") {
    database = "wrong key — use the secret one";
  } else if (isDbConfigured()) {
    database = "connected";
    for (const table of tables) {
      // A real read, not a HEAD: a HEAD has no body, so errors arrive blank
      // and a broken setup can pass for a working one.
      const { error } = await db().from(table).select("*").limit(1);
      if (!error) continue;
      if (error.code === "PGRST125") {
        database = "wrong address";
        break;
      }
      // Wrong key and missing schema look different, and need different fixes.
      if (/JWT|Invalid API key|apikey|401|403|permission/i.test(error.message)) {
        database = "rejected";
        break;
      }
      missing.push(table);
    }
    if (database === "connected" && missing.length) database = "tables missing";

    // Signing in saves an account row. None after you've signed in means
    // saves are being refused even though reading works.
    if (database === "connected") {
      const { data } = await db().from("accounts").select("github_id").limit(1);
      accountsSaved = Boolean(data?.length);

      // Payments write to columns added after the first version of the schema.
      const { error } = await db().from("accounts").select("billing_subscription_id").limit(1);
      billingColumns = !error;
    }
  }

  // Codarc trims a pasted REST address back to the project address itself,
  // but it's worth knowing the value in Vercel is longer than it needs to be.
  const rawUrl = env("SUPABASE_URL");
  const urlTrimmed = Boolean(rawUrl && rawUrl.replace(/\/+$/, "") !== supabaseUrl());

  return NextResponse.json({
    database,
    ...(missing.length ? { missingTables: missing } : {}),
    databaseKey: keyKind,
    ...(urlTrimmed ? { databaseUrl: "had extra on the end — Codarc ignores it" } : {}),
    ...(accountsSaved !== undefined ? { accountsSaved } : {}),
    ...(billingColumns !== undefined ? { billingColumns } : {}),
    liveCursors: hasEnv("SUPABASE_ANON_KEY") && hasEnv("SESSION_SECRET"),
    signIn: hasEnv("GITHUB_APP_CLIENT_ID") && hasEnv("GITHUB_APP_CLIENT_SECRET") && hasEnv("SESSION_SECRET"),
    githubApp: hasEnv("GITHUB_APP_ID") && (hasEnv("GITHUB_APP_PRIVATE_KEY") || hasEnv("GITHUB_APP_PRIVATE_KEY_PATH")),
    drafting: hasEnv("ANTHROPIC_API_KEY"),
    githubToken: hasEnv("GITHUB_TOKEN"),
    payments: paymentsConfigured(),
    ownerLock: hasEnv("CODARC_OWNER_KEY"),
  });
}
