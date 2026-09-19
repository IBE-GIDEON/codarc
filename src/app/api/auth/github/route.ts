import { NextResponse } from "next/server";
import { STATE_COOKIE, packState } from "@/lib/oauth";
import { canSignIn } from "@/lib/session";

export const runtime = "nodejs";

/** Starts "Sign in with GitHub". */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("back") ?? "/";
  const back = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (!canSignIn()) {
    return NextResponse.redirect(
      new URL(`${back}?signin=unavailable`, request.url),
    );
  }

  const { state, nonce } = packState(back);

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", process.env.GITHUB_APP_CLIENT_ID!);
  authorize.searchParams.set(
    "redirect_uri",
    new URL("/api/github/callback", request.url).toString(),
  );
  authorize.searchParams.set("state", state);

  const response = NextResponse.redirect(authorize);
  response.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return response;
}
