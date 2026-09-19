import { NextResponse } from "next/server";
import { keyMatches, lockEnabled } from "@/lib/owner";

export const runtime = "nodejs";

/**
 * Unlocks drafting for whoever holds the owner key.
 * Visit /api/unlock?key=... once; the cookie does the rest.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const key = params.get("key") ?? "";

  const raw = params.get("back") ?? "/";
  const back = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (!lockEnabled()) {
    return NextResponse.json({
      ok: true,
      note: "No owner key is set, so drafting is already open to everyone.",
    });
  }

  if (!keyMatches(key)) {
    // Deliberately vague, and no hint about length or format.
    return NextResponse.json(
      { error: "That key isn't right", hint: "Check it and try again." },
      { status: 401 },
    );
  }

  const response = NextResponse.redirect(new URL(back, request.url));
  response.cookies.set("codarc-owner", key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
