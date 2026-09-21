import "server-only";
import {
  installationForRepo,
  installationToken,
  isConfigured,
  type Installation,
} from "@/lib/github-app";
import { entitlement } from "@/lib/accounts";
import { teamFor } from "@/lib/teams";
import type { User } from "@/lib/session";

/**
 * Who may read or change a repository through Codarc.
 *
 * Installing the GitHub App is how someone says "Codarc may touch this". But
 * the app's key opens every repository anyone has ever installed it on, so
 * finding an installation isn't enough — it has to be on *your* account, or
 * on the account of the Studio owner whose team you're on. Without this, any
 * signed-in stranger could open a pull request on someone else's project.
 *
 * Organisation installs are left out for now: proving someone belongs to an
 * organisation needs their own GitHub token, which Codarc doesn't keep.
 */

export type RepoAccess = { installation: Installation; via: "own" | "team" };

export async function repoAccess(
  user: User | null,
  owner: string,
  repo: string,
): Promise<RepoAccess | null> {
  if (!user || !isConfigured()) return null;

  const installation = await installationForRepo(owner, repo);
  if (!installation || installation.accountType !== "User") return null;

  if (installation.accountId === user.id) return { installation, via: "own" };

  const team = await teamFor(user.id);
  if (team && team.ownerId === installation.accountId) {
    // The seat only counts while the owner is still paying for Studio.
    const ent = await entitlement(user);
    if (ent.plan === "studio") return { installation, via: "team" };
  }

  return null;
}

/** A token that can read this one repository and nothing else. */
export function readToken(access: RepoAccess, repo: string) {
  return installationToken(access.installation.id, {
    repo,
    permissions: { contents: "read", metadata: "read" },
  });
}

/** A token that can open a pull request on this one repository. */
export function writeToken(access: RepoAccess, repo: string) {
  return installationToken(access.installation.id, {
    repo,
    permissions: { contents: "write", pull_requests: "write", metadata: "read" },
  });
}
