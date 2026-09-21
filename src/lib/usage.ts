import "server-only";
import { db, isDbConfigured } from "@/lib/db";
import type { Entitlement } from "@/lib/accounts";

/**
 * The counters behind the numbers on the pricing page.
 *
 * Everything here fails *open* when the database isn't configured — a missing
 * env var should never stop a paying customer mid-task. Once Supabase is
 * connected the limits are real.
 */

export type Refusal = { ok: false; error: string; hint: string };
type Ok = { ok: true };

const repoKey = (repo: string) => repo.trim().toLowerCase();

function startOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/**
 * A repository becomes one of your projects the first time you use a paid
 * feature on it. Using it again is always free; a new one needs room.
 */
export async function claimProject(ent: Entitlement, repo: string): Promise<Ok | Refusal> {
  if (!isDbConfigured() || !ent.billingId) return { ok: true };

  const key = repoKey(repo);
  const { data: existing } = await db()
    .from("projects")
    .select("id")
    .eq("account_id", ent.billingId)
    .eq("repo", key)
    .maybeSingle();
  if (existing) return { ok: true };

  const limit = ent.limits?.projects ?? null;
  if (limit !== null) {
    const { count } = await db()
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("account_id", ent.billingId);
    if ((count ?? 0) >= limit) {
      return {
        ok: false,
        error: `You're using all ${limit} of your projects`,
        hint: "Solo covers three apps. Studio has no limit on projects.",
      };
    }
  }

  const { error } = await db()
    .from("projects")
    .insert({ account_id: ent.billingId, repo: key });
  // A duplicate here means a parallel request claimed it first — fine.
  if (error && !error.message.includes("duplicate")) {
    console.error("[usage] claimProject", error.message);
  }
  return { ok: true };
}

export async function changesThisMonth(billingId: number): Promise<number> {
  if (!isDbConfigured()) return 0;
  const { count } = await db()
    .from("changes")
    .select("id", { count: "exact", head: true })
    .eq("account_id", billingId)
    .gte("created_at", startOfMonth());
  return count ?? 0;
}

export async function checkChangeAllowance(ent: Entitlement): Promise<Ok | Refusal> {
  if (!isDbConfigured() || !ent.billingId) return { ok: true };
  const limit = ent.limits?.changesPerMonth ?? null;
  if (limit === null) return { ok: true };

  const used = await changesThisMonth(ent.billingId);
  if (used >= limit) {
    return {
      ok: false,
      error: `You've used all ${limit} changes this month`,
      hint: "Your map keeps working. Changes come back on the 1st, or Studio has no monthly limit.",
    };
  }
  return { ok: true };
}

/** Recorded only when a draft actually comes back — a failed attempt is free. */
export async function recordChange(ent: Entitlement, repo: string) {
  if (!isDbConfigured() || !ent.billingId) return;
  const { error } = await db()
    .from("changes")
    .insert({ account_id: ent.billingId, repo: repoKey(repo) });
  if (error) console.error("[usage] recordChange", error.message);
}

export async function usageSummary(ent: Entitlement) {
  if (!isDbConfigured() || !ent.billingId) return null;
  const [{ count: projects }, changes] = await Promise.all([
    db()
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("account_id", ent.billingId),
    changesThisMonth(ent.billingId),
  ]);
  return {
    projects: projects ?? 0,
    projectLimit: ent.limits?.projects ?? null,
    changes,
    changeLimit: ent.limits?.changesPerMonth ?? null,
  };
}
