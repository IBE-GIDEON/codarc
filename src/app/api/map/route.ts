import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { analyzeRepo } from "@/lib/analyze";
import { RepoError, parseRepoInput } from "@/lib/github";
import { GithubAppError } from "@/lib/github-app";
import { readToken, repoAccess } from "@/lib/access";
import { currentUser } from "@/lib/session";
import { accountsReachable, entitlement } from "@/lib/accounts";
import { isDbConfigured } from "@/lib/db";
import { decodeShare } from "@/lib/share";
import { paymentsConfigured } from "@/lib/payments";
import { TRIAL_COOKIE, lookSpentOn, mayLook, spendLook, trialCookie } from "@/lib/trial";
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

type Gate =
  | { ok: true; spend: boolean }
  | { ok: false; error: string; hint: string; signedIn: boolean };

/**
 * Who gets to see a map. A plan sees everything; everybody else gets the one
 * free look, and a link somebody shared stays open on the sharer's plan.
 *
 * This runs before the cache on purpose. The cache is keyed on the repository
 * alone and shared by every visitor, so checking after it would hand out
 * whatever happened to be warm.
 */
async function gate(key: string, share: string | null): Promise<Gate> {
  if (share) {
    const decoded = decodeShare(share);
    if (decoded.ok) {
      const shared = `${decoded.share.owner}/${decoded.share.repo}`.toLowerCase();
      if (shared === key) return { ok: true, spend: false };
    }
  }

  /*
   * The gate sleeps until there's something to buy. Turning somebody away
   * towards a checkout that answers "payments aren't switched on yet" loses
   * a visitor and gains nothing — and it would burn their free look on the
   * one day they couldn't have paid anyway. It wakes by itself the moment
   * the payment keys are set.
   */
  if (!paymentsConfigured()) return { ok: true, spend: false };

  // With no database we can't tell who's paying, and locking paying people
  // out of their own app is worse than letting a few maps through.
  if (!isDbConfigured()) return { ok: true, spend: false };

  const user = await currentUser();
  const ent = await entitlement(user);
  if (ent.plan !== "none") return { ok: true, spend: false };

  const look = mayLook({
    hasPlan: false,
    spentOn: lookSpentOn((await cookies()).get(TRIAL_COOKIE)?.value),
    repo: key,
  });

  if (look.ok) return look;

  // Before turning away somebody signed in: check the database actually
  // answered. An outage reads exactly like "no plan", and locking a paying
  // customer out of their own app is the worst thing this gate could do.
  if (user && !(await accountsReachable())) return { ok: true, spend: false };

  return { ...look, signedIn: Boolean(user) };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const input = params.get("repo");

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

    const pass = await gate(key, params.get("share"));
    if (!pass.ok) {
      const back = encodeURIComponent(`/r/${owner}/${repo}`);
      return NextResponse.json(
        {
          error: pass.error,
          hint: pass.hint,
          // The way out, worked out here because only the server knows
          // whether this person has signed in yet.
          gate: {
            plans: `/choose?back=${back}`,
            signIn: pass.signedIn ? null : `/api/auth/github?back=${back}`,
          },
        },
        { status: 402 },
      );
    }

    /** Spends the free look on whatever map we're about to hand over. */
    const sent = (response: NextResponse) => {
      const token = pass.spend ? spendLook(key) : null;
      if (token) response.cookies.set(trialCookie.name, token, trialCookie.options);
      return response;
    };

    const hit = cache.get(key);
    if (fresh(hit)) return sent(NextResponse.json(hit!.body));

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
      return sent(NextResponse.json(map));
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
      if (fresh(privateHit)) return sent(privately(privateHit!.body));

      const map = await analyzeRepo(owner, repo, await readToken(access, repo));
      privateCache.set(key, { at: Date.now(), body: map });
      return sent(privately(map));
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
