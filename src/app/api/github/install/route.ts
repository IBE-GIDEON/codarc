import { NextResponse } from "next/server";
import { GithubAppError, appSlug, isConfigured } from "@/lib/github-app";
import { STATE_COOKIE, packState } from "@/lib/oauth";

export const runtime = "nodejs";

/** Sends the person to GitHub to pick which repositories Codarc may touch. */
export async function GET(request: Request) {
  const raw = new URL(request.url).searchParams.get("back") ?? "/";
  const back = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (!isConfigured()) {
    return NextResponse.redirect(
      new URL(`${back}?github=notconfigured`, request.url),
    );
  }

  try {
    const slug = await appSlug();
    const url = new URL(`https://github.com/apps/${slug}/installations/new`);
    // The app asks for sign-in during install, so GitHub comes back with a
    // sign-in code too. Packing the state the same way as "Sign in with
    // GitHub" lets the callback accept it — which refreshes the session with
    // any company just connected, so it shows on the dashboard straight away.
    const { state, nonce } = packState(back);
    url.searchParams.set("state", state);

    const response = NextResponse.redirect(url);
    response.cookies.set(STATE_COOKIE, nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      // Picking repositories can take a while; give it longer than sign-in.
      maxAge: 1800,
    });
    return response;
  } catch (err) {
    const reason = err instanceof GithubAppError ? "misconfigured" : "failed";
    return NextResponse.redirect(
      new URL(`${back}?github=${reason}`, request.url),
    );
  }
}
