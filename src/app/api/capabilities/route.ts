import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isConfigured } from "@/lib/github-app";
import { atLeast, displayName, entitlement, getAccount } from "@/lib/accounts";
import { usageSummary } from "@/lib/usage";
import { canSignIn, currentUser } from "@/lib/session";
import { hasEnv } from "@/lib/env";

export const runtime = "nodejs";

/**
 * What this visitor can do right now, in the order they meet the gates:
 * look (free) → sign in → have a plan → draft.
 *
 * The UI asks rather than assuming, so it can say "choose a plan" instead of
 * letting someone type a request that was always going to be refused.
 */
export async function GET(request: Request) {
  const installation = (await cookies()).get("codarc-installation")?.value;
  const user = await currentUser();

  // `?as=customer` lets the owner look at their own paywall without signing
  // out. It only dresses the UI down — the real checks still run server-side.
  const asCustomer =
    new URL(request.url).searchParams.get("as") === "customer";

  const ent = asCustomer
    ? { plan: "none" as const, via: null, billingId: null, limits: null, canEdit: false }
    : await entitlement(user);
  const paid = ent.plan !== "none";
  const account = user ? await getAccount(user.id) : null;

  return NextResponse.json({
    user: user && {
      login: user.login,
      name: displayName(account, user),
      avatar: user.avatar,
    },
    // A teammate the owner set to view-only can look but not change.
    canEdit: paid && ent.canEdit,
    canSignIn: canSignIn(),
    signedIn: Boolean(user),
    plan: ent.plan,
    planVia: ent.via,
    hasPlan: paid,
    isStudio: atLeast(ent.plan, "studio"),
    usage: paid ? await usageSummary(ent) : null,
    canDraft: hasEnv("ANTHROPIC_API_KEY") && Boolean(user) && paid && ent.canEdit,
    canSend: isConfigured(),
    connected: Boolean(installation),
  });
}
