import { NextResponse } from "next/server";
import { hasEnv } from "@/lib/env";
import { isOwner, lockEnabled } from "@/lib/owner";
import { PaymentError, describeStore } from "@/lib/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * For whoever runs Codarc: lists the Lemon Squeezy store and its products
 * with their IDs, so setting up is copy-and-paste rather than hunting
 * through Lemon Squeezy's dashboard. Owner key only.
 */
export async function GET() {
  if (!lockEnabled() || !(await isOwner())) {
    return NextResponse.json({ error: "Only Codarc's owner can see this" }, { status: 403 });
  }
  if (!hasEnv("LEMONSQUEEZY_API_KEY")) {
    return NextResponse.json({
      step: "Add LEMONSQUEEZY_API_KEY in Vercel and redeploy, then open this page again.",
    });
  }

  try {
    const store = await describeStore();
    return NextResponse.json({
      step: "Copy these into Vercel: the store id → LEMONSQUEEZY_STORE_ID, the $29 monthly variant id → LEMONSQUEEZY_SOLO_VARIANT_ID, the $79 monthly variant id → LEMONSQUEEZY_STUDIO_VARIANT_ID.",
      ...store,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof PaymentError ? err.hint : "Lemon Squeezy didn't answer." },
      { status: 502 },
    );
  }
}
