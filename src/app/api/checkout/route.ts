import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { planById } from "@/lib/plans";
import { getAccount } from "@/lib/accounts";
import { PaymentError, createCheckout, paymentsConfigured } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Where a chosen plan turns into money: returns a Lemon Squeezy checkout
 * link, which the plan cards follow. The card is typed on Lemon Squeezy's
 * page, never Codarc's.
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      {
        error: "Sign in first",
        hint: "We need to know who you are before taking a payment.",
      },
      { status: 401 },
    );
  }

  let plan: string | undefined;
  let returnTo: string | undefined;
  try {
    ({ plan, returnTo } = await request.json());
  } catch {
    // falls through to the check below
  }

  const chosen = planById(plan);
  if (!chosen) {
    return NextResponse.json(
      { error: "That plan doesn't exist", hint: "Pick one of the two above." },
      { status: 400 },
    );
  }

  if (!paymentsConfigured()) {
    return NextResponse.json(
      {
        error: "Payments aren't switched on yet",
        hint: `You picked ${chosen.name} at $${chosen.price} a month. Nothing has been charged.`,
      },
      { status: 503 },
    );
  }

  // Already paying: a second checkout would mean a second bill. Switching
  // plans happens on the billing page instead.
  const account = await getAccount(user.id);
  if (
    account?.billing_subscription_id &&
    account.plan !== "none" &&
    account.plan_status !== "inactive"
  ) {
    return NextResponse.json({
      url: "/api/billing/portal",
      note: "already-subscribed",
    });
  }

  const origin = new URL(request.url).origin;
  const back = returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/dashboard";
  const redirectUrl = `${origin}/dashboard?paid=${chosen.id}&back=${encodeURIComponent(back)}`;

  try {
    const url = await createCheckout({ plan: chosen.id, user, redirectUrl });
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof PaymentError) {
      return NextResponse.json({ error: err.message, hint: err.hint }, { status: err.status });
    }
    console.error("[checkout]", err);
    return NextResponse.json(
      { error: "The payment page didn't open", hint: "Nothing has been charged. Try again in a moment." },
      { status: 500 },
    );
  }
}
