import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Where GitHub lands after someone installs the app. We only need the
 * installation id — it's the handle for acting on the repos they picked.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const installationId = params.get("installation_id");

  // `state` is our own return path, set on the way out. Keep it relative so a
  // crafted link can't bounce someone off to another site.
  const raw = params.get("state") ?? "/";
  const back = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";

  if (!installationId) {
    return NextResponse.redirect(
      new URL(`${back}?github=cancelled`, request.url),
    );
  }

  const response = NextResponse.redirect(
    new URL(`${back}?github=connected`, request.url),
  );

  response.cookies.set("codarc-installation", installationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
