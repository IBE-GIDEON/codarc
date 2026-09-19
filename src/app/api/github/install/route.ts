import { NextResponse } from "next/server";
import { GithubAppError, appSlug, isConfigured } from "@/lib/github-app";

export const runtime = "nodejs";

/** Sends the person to GitHub to pick which repositories Codarc may touch. */
export async function GET(request: Request) {
  const back = new URL(request.url).searchParams.get("back") ?? "/";

  if (!isConfigured()) {
    return NextResponse.redirect(
      new URL(`${back}?github=notconfigured`, request.url),
    );
  }

  try {
    const slug = await appSlug();
    const url = new URL(`https://github.com/apps/${slug}/installations/new`);
    // GitHub hands this back on the callback so we know where to return to.
    url.searchParams.set("state", back);
    return NextResponse.redirect(url);
  } catch (err) {
    const reason = err instanceof GithubAppError ? "misconfigured" : "failed";
    return NextResponse.redirect(
      new URL(`${back}?github=${reason}`, request.url),
    );
  }
}
