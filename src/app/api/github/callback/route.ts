import { NextResponse } from "next/server";
import { STATE_COOKIE, identify, unpackState } from "@/lib/oauth";
import { canSignIn, seal, sessionCookie } from "@/lib/session";

export const runtime = "nodejs";

/**
 * One callback for both journeys, because a GitHub App has a single redirect
 * URI and asking someone to register two is a step they'd get wrong.
 *
 * - `code` present      → they signed in; work out who they are
 * - `installation_id`   → they granted access to repositories
 *
 * Installing with OAuth turned on sends both at once, which is why neither
 * branch returns early.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const installationId = params.get("installation_id");

  const unpacked = unpackState(params.get("state"));
  const back = unpacked?.back ?? "/";

  const flags: string[] = [];
  let session: string | null = null;

  if (code && canSignIn()) {
    // The nonce must match the cookie we set on the way out.
    const expected = request.headers
      .get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith(`${STATE_COOKIE}=`))
      ?.split("=")[1];

    if (!unpacked || !expected || unpacked.nonce !== expected) {
      flags.push("signin=expired");
    } else {
      const user = await identify(code);
      if (!user) {
        flags.push("signin=failed");
      } else {
        session = seal({
          id: user.id,
          login: user.login,
          name: user.name,
          avatar: user.avatar_url,
        });
        flags.push("signin=ok");
      }
    }
  }

  if (installationId) flags.push("github=connected");
  if (!code && !installationId) flags.push("github=cancelled");

  const separator = back.includes("?") ? "&" : "?";
  const response = NextResponse.redirect(
    new URL(`${back}${flags.length ? separator + flags.join("&") : ""}`, request.url),
  );

  if (session) {
    response.cookies.set(sessionCookie.name, session, sessionCookie.options);
  }
  if (installationId) {
    response.cookies.set("codarc-installation", installationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  response.cookies.delete(STATE_COOKIE);

  return response;
}
