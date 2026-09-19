import { NextResponse } from "next/server";
import { analyzeRepo } from "@/lib/analyze";
import { RepoError, parseRepoInput } from "@/lib/github";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Small in-process cache — mapping the same repo twice in a row is common. */
const cache = new Map<string, { at: number; body: unknown }>();
const TTL = 5 * 60 * 1000;

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
    if (hit && Date.now() - hit.at < TTL) {
      return NextResponse.json(hit.body);
    }

    const map = await analyzeRepo(owner, repo);
    cache.set(key, { at: Date.now(), body: map });
    return NextResponse.json(map);
  } catch (err) {
    if (err instanceof RepoError) {
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
