import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, unseal } from "@/lib/session-token";

/**
 * The landing page is for people meeting Codarc for the first time. Anyone
 * already signed in goes straight to their dashboard, the way Notion opens on
 * your workspace rather than its homepage.
 *
 * `/?site` still shows the landing page, for when you want to see it.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.searchParams.has("site")) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && unseal(token)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

// Only the homepage. Everything else — API routes above all — never passes
// through here.
export const config = {
  matcher: "/",
};
