import { NextResponse } from "next/server";
import { applySubscription, readSubscriptionEvent, verifyWebhook } from "@/lib/payments";

export const runtime = "nodejs";

/**
 * Lemon Squeezy tells us here when someone pays, cancels, or their card
 * fails. This is the only thing that turns a plan on or off.
 *
 * Anything not signed with our secret is refused before it's even read.
 * A 500 makes Lemon Squeezy try again later, so we only send one when saving
 * actually failed.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  if (!verifyWebhook(raw, request.headers.get("x-signature"))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Not JSON" }, { status: 400 });
  }

  const event = readSubscriptionEvent(body);
  if (!event) return NextResponse.json({ ok: true, ignored: true });

  const saved = await applySubscription(event);
  return saved
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Couldn't save" }, { status: 500 });
}
