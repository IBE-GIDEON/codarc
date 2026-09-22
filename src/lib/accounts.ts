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
  /** Set by payments; absent until the billing columns exist. */
  plan_ends_at?: string | null;
  billing_subscription_id?: string | null;
  /** The name they chose. Absent until the column exists; null until they choose. */
  display_name?: string | null;
};

/** What other people see: the name they chose, else GitHub's name, else the login. */
export function displayName(
  account: { display_name?: string | null; name?: string | null; login?: string } | null,
  fallback: { name?: string | null; login: string },
): string {
  return (
    account?.display_name?.trim() ||
    account?.name?.trim() ||
    fallback.name?.trim() ||
    account?.login ||
    fallback.login
  );
}

/** Keeps a chosen name to something a person would call themselves. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // No control characters, collapsed spaces, a sensible length.
  const name = Array.from(raw)
    .filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return name.length >= 1 && name.length <= 60 ? name : null;
}

export async function setDisplayName(
  user: Omit<User, "at">,
  name: string,
): Promise<{ message: string; code?: string } | null> {
  if (!isDbConfigured()) return { message: "The database isn't connected." };
  // Make sure the row exists first — the name hangs off it.
  const failure = await upsertAccount(user);
  if (failure) return failure;
  const { error } = await db()
    .from("accounts")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("github_id", user.id);
  if (error) console.error("[accounts] display name", error.code ?? "", error.message);
  return error;
}

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
  // `*` rather than a column list: naming a column that hasn't been added yet
  // would fail the whole read, and everyone would lose their plan with it.
  const { data } = await db()
    .from("accounts")
    .select("*")
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
  /**
   * May change code. Always true for someone on their own plan; a team
   * owner can set a teammate to view-only.
   */
  canEdit: boolean;
};

const NONE: Entitlement = {
  plan: "none",
  via: null,
  billingId: null,
  limits: null,
  canEdit: false,
};

/**
 * Still allowed in:
 * - paying ("active")
 * - a card failed and it's being retried for up to two weeks ("past_due")
 * - cancelled, but the month they paid for hasn't run out yet
 */
const isLive = (a: AccountRow | null) => {
  if (!a || a.plan === "none") return false;
  if (a.plan_status === "active" || a.plan_status === "past_due") return true;
  return (
    a.plan_status === "cancelled" &&
    Boolean(a.plan_ends_at && Date.parse(a.plan_ends_at) > Date.now())
  );
};

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
      canEdit: true,
    };
  }

  if (!isDbConfigured()) return NONE;

  const own = await getAccount(user.id);
  const ownLive = isLive(own);
  if (ownLive && own!.plan === "studio") {
    return {
      plan: "studio",
      via: "own",
      billingId: user.id,
      limits: planById("studio")!.limits,
      canEdit: true,
    };
  }

  // Not on Studio themselves — are they on somebody's Studio team? That
  // beats their own Solo plan: joining a team shouldn't leave you with less.
  // `*` so a column that hasn't been added yet (can_edit) can't break the read.
  const { data: membership } = await db()
    .from("team_members")
    .select("*, teams!inner(owner_id)")
    .eq("account_id", user.id)
    .maybeSingle();

  const row = membership as { can_edit?: boolean; teams?: { owner_id?: number } } | null;
  const ownerId = row?.teams?.owner_id;
  if (ownerId && ownerId !== user.id) {
    const owner = await getAccount(ownerId);
    const canEdit = row?.can_edit !== false;
    // View-only on the team but paying for Solo themselves: their own plan
    // still lets them change their own things, so that wins.
    if (isLive(owner) && owner!.plan === "studio" && (canEdit || !ownLive)) {
      return {
        plan: "studio",
        via: "team",
        billingId: ownerId,
        limits: planById("studio")!.limits,
        canEdit,
      };
    }
  }

  if (ownLive) {
    return {
      plan: own!.plan,
      via: "own",
      billingId: user.id,
      limits: planById(own!.plan)!.limits,
      canEdit: true,
    };
  }

  return NONE;
}

/**
 * Whether this account is paying for Studio right now, from the database —
 * which is where teammates get their Studio from. (The owner key makes its
 * holder Studio, but only in their own browser; it gives teammates nothing.)
 */
export async function hasLiveStudio(githubId: number): Promise<boolean> {
  const account = await getAccount(githubId);
  return isLive(account) && account!.plan === "studio";
}

/** Studio outranks Solo outranks nothing. */
export function atLeast(plan: Entitlement["plan"], min: PlanId) {
  const rank = { none: 0, solo: 1, studio: 2 } as const;
  return rank[plan] >= rank[min];
}
