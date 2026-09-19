import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isConfigured } from "@/lib/github-app";

export const runtime = "nodejs";

/**
 * What this deployment can actually do right now. The map works with no keys
 * at all, so the UI asks rather than assuming — better to say "not switched on
 * yet" than to let someone type a request that was always going to fail.
 */
export async function GET() {
  const installation = (await cookies()).get("codarc-installation")?.value;
  return NextResponse.json({
    canDraft: Boolean(process.env.ANTHROPIC_API_KEY),
    canSend: isConfigured(),
    connected: Boolean(installation),
  });
}
