import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isConfigured } from "@/lib/github-app";
import { hasActivePlan } from "@/lib/billing";
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
  const paid = asCustomer ? false : await hasActivePlan(user);

  return NextResponse.json({
    user: user && {
      login: user.login,
      name: user.name,
      avatar: user.avatar,
    },
    canSignIn: canSignIn(),
    signedIn: Boolean(user),
    hasPlan: paid,
    canDraft: hasEnv("ANTHROPIC_API_KEY") && Boolean(user) && paid,
    canSend: isConfigured(),
    connected: Boolean(installation),
  });
}
