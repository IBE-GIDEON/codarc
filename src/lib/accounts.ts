import "server-only";
import { db, isDbConfigured } from "@/lib/db";
import type { User } from "@/lib/session";
import { planById, type Limits, type PlanId } from "@/lib/plans";
import { isOwner, lockEnabled } from "@/lib/owner";

export type AccountRow = {
  github_id: number;
  login: string;
  name: string | null;
  avatar: string | null;
  plan: "none" | PlanId;
  plan_status: "inactive" | "active" | "past_due" | "cancelled";
  stripe_customer_id: string | null;
};

/**
 * Called on every sign-in so the account row always reflects GitHub.
 * Returns the failure, if any, so callers that need the row can say why.
 */
export async function upsertAccount(
  user: Omit<User, "at">,
): Promise<{ message: string; code?: string } | null> {
  if (!isDbConfigured()) return null;
  const { error } = await db()
    .from("accounts")
    .upsert(
      {
        github_id: user.id,
        login: user.login,
        name: user.name,
        avatar: user.avatar,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "github_id", ignoreDuplicates: false },
    );
  if (error) console.error("[accounts] upsert", error.code ?? "", error.message);
  return error;
}

export async function getAccount(githubId: number): Promise<AccountRow | null> {
  if (!isDbConfigured()) return null;
  const { data } = await db()
    .from("accounts")
    .select("github_id, login, name, avatar, plan, plan_status, stripe_customer_id")
    .eq("github_id", githubId)
    .maybeSingle();
  return (data as AccountRow | null) ?? null;
}

/**
 * What someone is allowed to do, and on whose account it counts.
 *
 * A team member doesn't have a plan of their own — they ride on the team
 * owner's Studio plan, and anything they use counts against the owner. So
 * `billingId` is the account the usage belongs to, which isn't always theirs.
 */
export type Entitlement = {
  plan: "none" | PlanId;
  via: "own" | "team" | "owner-key" | null;
  billingId: number | null;
  limits: Limits | null;
};

const NONE: Entitlement = { plan: "none", via: null, billingId: null, limits: null };

const isLive = (a: AccountRow | null) =>
  Boolean(a && a.plan !== "none" && a.plan_status === "active");

export async function entitlement(user: User | null): Promise<Entitlement> {
  if (!user) return NONE;

  // The owner key is a skeleton key: full Studio, so you can use your own
  // product before billing exists.
  if (lockEnabled() && (await isOwner())) {
    return {
      plan: "studio",
      via: "owner-key",
      billingId: user.id,
      limits: planById("studio")!.limits,
    };
  }

  if (!isDbConfigured()) return NONE;

  const own = await getAccount(user.id);
  if (isLive(own)) {
    return {
      plan: own!.plan,
      via: "own",
      billingId: user.id,
      limits: planById(own!.plan)!.limits,
    };
  }

  // Not paying themselves — are they on somebody's team?
  const { data: membership } = await db()
    .from("team_members")
    .select("team_id, teams!inner(owner_id)")
    .eq("account_id", user.id)
    .maybeSingle();

  const ownerId = (membership as { teams?: { owner_id?: number } } | null)?.teams
    ?.owner_id;
  if (ownerId && ownerId !== user.id) {
    const owner = await getAccount(ownerId);
    if (isLive(owner) && owner!.plan === "studio") {
      return {
        plan: "studio",
        via: "team",
        billingId: ownerId,
        limits: planById("studio")!.limits,
      };
    }
  }

  return NONE;
}

/** Studio outranks Solo outranks nothing. */
export function atLeast(plan: Entitlement["plan"], min: PlanId) {
  const rank = { none: 0, solo: 1, studio: 2 } as const;
  return rank[plan] >= rank[min];
}
