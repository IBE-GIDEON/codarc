import { NextResponse } from "next/server";
import { db, isDbConfigured } from "@/lib/db";
import { hasEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Is everything plugged in? Answers yes/no for each part and nothing more —
 * no counts, no rows, no key fragments. Safe to leave public, and the first
 * thing to open when something isn't working.
 */
export async function GET() {
  const tables = ["accounts", "projects", "changes", "teams", "team_members", "team_invites"];

  let database: "connected" | "not configured" | "tables missing" | "rejected" = "not configured";
  const missing: string[] = [];

  if (isDbConfigured()) {
    database = "connected";
    for (const table of tables) {
      const { error } = await db().from(table).select("*", { count: "exact", head: true });
      if (!error) continue;
      // Wrong key and missing schema look different, and need different fixes.
      if (/JWT|Invalid API key|apikey|401|403|permission/i.test(error.message)) {
        database = "rejected";
        break;
      }
      missing.push(table);
    }
    if (database === "connected" && missing.length) database = "tables missing";
  }

  return NextResponse.json({
    database,
    ...(missing.length ? { missingTables: missing } : {}),
    liveCursors: hasEnv("SUPABASE_ANON_KEY") && hasEnv("SESSION_SECRET"),
    signIn: hasEnv("GITHUB_APP_CLIENT_ID") && hasEnv("GITHUB_APP_CLIENT_SECRET") && hasEnv("SESSION_SECRET"),
    githubApp: hasEnv("GITHUB_APP_ID") && (hasEnv("GITHUB_APP_PRIVATE_KEY") || hasEnv("GITHUB_APP_PRIVATE_KEY_PATH")),
    drafting: hasEnv("ANTHROPIC_API_KEY"),
    githubToken: hasEnv("GITHUB_TOKEN"),
    ownerLock: hasEnv("CODARC_OWNER_KEY"),
  });
}
