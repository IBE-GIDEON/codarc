import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { planById } from "@/lib/plans";
import { hasEnv } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Where a chosen plan turns into money.
 *
 * Stripe isn't connected yet, so this deliberately refuses rather than
 * pretending. When STRIPE_SECRET_KEY exists, create a Checkout Session here
 * and return its url — the client already follows `url` if it's there.
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
  try {
    ({ plan } = await request.json());
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

  if (!hasEnv("STRIPE_SECRET_KEY")) {
    return NextResponse.json(
      {
        error: "Payments aren't switched on yet",
        hint: `You picked ${chosen.name} at $${chosen.price} a month. Nothing has been charged — card payments are the next thing being connected.`,
      },
      { status: 503 },
    );
  }

  // TODO: create a Stripe Checkout Session for `chosen` and return { url }.
  return NextResponse.json(
    {
      error: "Payments aren't finished yet",
      hint: "The card step is still being built. Nothing has been charged.",
    },
    { status: 503 },
  );
}
