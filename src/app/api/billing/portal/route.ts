import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { getAccount } from "@/lib/accounts";
import { PaymentError, paymentsConfigured, portalUrl } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * "Manage billing": change card, switch plan, cancel, download receipts —
 * all on Lemon Squeezy's own page. Its links expire after a day, so a fresh
 * one is fetched on every click.
 */
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(`/api/auth/github?back=${encodeURIComponent("/api/billing/portal")}`, request.url),
    );
  }

  const account = await getAccount(user.id);
  const subscriptionId = account?.billing_subscription_id;

  // Nothing bought yet (or a plan given by hand): send them to the plans.
  if (!paymentsConfigured() || !subscriptionId) {
    return NextResponse.redirect(
      new URL(`/choose?back=${encodeURIComponent("/dashboard")}`, request.url),
    );
  }

  try {
    return NextResponse.redirect(await portalUrl(subscriptionId));
  } catch (err) {
    if (!(err instanceof PaymentError)) console.error("[billing portal]", err);
    return NextResponse.redirect(new URL("/dashboard?billing=unavailable", request.url));
  }
}
