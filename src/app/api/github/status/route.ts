import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isConfigured } from "@/lib/github-app";

export const runtime = "nodejs";

/** The install cookie is httpOnly, so the browser has to ask. */
export async function GET() {
  const installation = (await cookies()).get("codarc-installation")?.value;
  return NextResponse.json({
    configured: isConfigured(),
    connected: Boolean(installation),
  });
}
