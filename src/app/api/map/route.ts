import { NextResponse } from "next/server";
import { analyzeRepo } from "@/lib/analyze";
import { RepoError, parseRepoInput } from "@/lib/github";
import { GithubAppError } from "@/lib/github-app";
import { readToken, repoAccess } from "@/lib/access";
import { currentUser } from "@/lib/session";
import { allow, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Small in-process cache — mapping the same repo twice in a row is common. */
const cache = new Map<string, { at: number; body: unknown }>();
/**
 * Private maps live apart, and are only handed out after the access check
 * has passed for whoever is asking.
 */
const privateCache = new Map<string, { at: number; body: unknown }>();
const TTL = 5 * 60 * 1000;

const fresh = (hit?: { at: number }) => Boolean(hit && Date.now() - hit.at < TTL);
const privately = (body: unknown) =>
  NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("repo");

  if (!input) {
    return NextResponse.json(
      {
        error: "No repository given",
        hint: "Add ?repo=owner/name to the address.",
      },
      { status: 400 },
    );
  }

  try {
    const { owner, repo } = parseRepoInput(input);
    const key = `${owner}/${repo}`.toLowerCase();

    const hit = cache.get(key);
    if (fresh(hit)) return NextResponse.json(hit!.body);

    // Cached answers are free; a fresh read costs GitHub requests, so those
    // are rationed per visitor.
    if (!allow(`map:${clientKey(request)}`, 20, 60_000)) {
      return NextResponse.json(
        {
          error: "That's a lot of maps in a minute",
          hint: "Give it a minute and try again — maps you've already opened still load straight away.",
        },
        { status: 429 },
      );
    }

    try {
      const map = await analyzeRepo(owner, repo);
      cache.set(key, { at: Date.now(), body: map });
      return NextResponse.json(map);
    } catch (err) {
      // GitHub says "not found" for private repositories too. Before giving
      // up, see whether this person is allowed in.
      if (!(err instanceof RepoError && err.status === 404)) throw err;

      const user = await currentUser();
      const access = await repoAccess(user, owner, repo);
      if (!access) {
        if (!user) throw err;
        throw new RepoError(
          `We couldn't open ${owner}/${repo}`,
          "If it's private and yours, connect GitHub from your dashboard and tick this project. If it's your company's, someone who runs it on GitHub needs to connect Codarc there — and GitHub has to let you see it.",
          404,
        );
      }

      const privateHit = privateCache.get(key);
      if (fresh(privateHit)) return privately(privateHit!.body);

      const map = await analyzeRepo(owner, repo, await readToken(access, repo));
      privateCache.set(key, { at: Date.now(), body: map });
      return privately(map);
    }
  } catch (err) {
    if (err instanceof RepoError || err instanceof GithubAppError) {
      return NextResponse.json(
        { error: err.message, hint: err.hint },
        { status: err.status },
      );
    }
    console.error("[map]", err);
    return NextResponse.json(
      {
        error: "Something broke while reading that repository",
        hint: "This one's on us. Try again, and if it keeps happening try a different repository.",
      },
      { status: 500 },
    );
  }
}
