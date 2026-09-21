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
    const step =
      store.products.length === 0
        ? "This key can't see any products. Either none are made yet, or they were made in the other mode — a key made with Test mode ON only sees test products. Turn Test mode on, check both products are there and published, make a new API key while it's on, put it in Vercel, redeploy, and open this page again."
        : store.variants.length === 0
          ? "Products found, but no prices yet. Open each product in Lemon Squeezy, give it a monthly price, publish, then reload this page."
          : "Copy into Vercel: the store your products are in → LEMONSQUEEZY_STORE_ID, the $29 monthly variant id → LEMONSQUEEZY_SOLO_VARIANT_ID, the $79 monthly variant id → LEMONSQUEEZY_STUDIO_VARIANT_ID. Then redeploy.";
    return NextResponse.json({ step, ...store });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof PaymentError ? err.hint : "Lemon Squeezy didn't answer." },
      { status: 502 },
    );
  }
}
