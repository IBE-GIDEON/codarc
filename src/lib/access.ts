import "server-only";
import {
  CAN_WRITE,
  installationForRepo,
  installationToken,
  isConfigured,
  repoRole,
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
 * finding an installation isn't enough. GitHub has to agree that *this
 * person* can see the repository — which is what makes company
 * (organisation) repos work: access there comes from the company's teams,
 * not from owning it. Studio members also get what their owner can reach.
 */

export type RepoAccess = {
  installation: Installation;
  via: "own" | "github" | "team";
  /** Can change code and open pull requests, not just look. */
  canWrite: boolean;
};

export async function repoAccess(
  user: User | null,
  owner: string,
  repo: string,
): Promise<RepoAccess | null> {
  if (!user || !isConfigured()) return null;

  const installation = await installationForRepo(owner, repo);
  if (!installation) return null;

  // Your own account: no need to ask.
  if (installation.accountType === "User" && installation.accountId === user.id) {
    return { installation, via: "own", canWrite: true };
  }

  // A company repo, or someone else's you've been added to.
  const role = await repoRole(installation.id, owner, repo, user);
  if (role !== "none") {
    return { installation, via: "github", canWrite: CAN_WRITE.has(role) };
  }

  // On a Studio team: whatever the owner can reach, the team can too.
  const team = await teamFor(user.id);
  const teamOwner =
    team && team.ownerId !== user.id ? team.members.find((m) => m.role === "owner") : null;
  if (teamOwner) {
    const ownerReaches =
      (installation.accountType === "User" && installation.accountId === teamOwner.githubId) ||
      CAN_WRITE.has(
        await repoRole(installation.id, owner, repo, {
          id: teamOwner.githubId,
          login: teamOwner.login,
        }),
      );
    // The seat only counts while the owner is still paying for Studio.
    if (ownerReaches && (await entitlement(user)).plan === "studio") {
      return { installation, via: "team", canWrite: true };
    }
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
