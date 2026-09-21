import { ExternalLink } from "lucide-react";
import {
  installationForUser,
  isConfigured,
  listingToken,
  reposForInstallation,
  roleWithToken,
  type RepoSummary,
} from "@/lib/github-app";
import { ago } from "@/lib/ago";
import { GithubMark } from "@/components/brand-marks";
import { Button } from "@/components/ui/button";
import { RepoList, type RepoRow } from "@/components/dashboard/repo-list";

function Heading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline gap-3">
      <h2 className="text-[14px] font-medium text-secondary">{children}</h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  );
}

function toRows(repos: RepoSummary[]): RepoRow[] {
  const now = Date.now();
  return repos.map((r) => ({
    owner: r.owner,
    name: r.name,
    isPrivate: r.isPrivate,
    description: r.description,
    updated: r.pushedAt ? ago(r.pushedAt, now) : "",
  }));
}

async function load(login: string, id: number) {
  const installation = await installationForUser(login, id);
  if (!installation) return { installation: null, rows: [] as RepoRow[] };
  return { installation, rows: toRows(await reposForInstallation(installation.id)) };
}

/** Runs `work` over `items`, a few at a time, keeping the order. */
async function inBatches<T, R>(items: T[], size: number, work: (item: T) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(...(await Promise.all(items.slice(i, i + size).map(work))));
  }
  return out;
}

/**
 * A company's projects. A company's install can cover repositories this
 * person has no business seeing, so each one is checked with GitHub first
 * and only the ones they can reach are listed.
 */
export async function OrgRepos({
  org,
  user,
}: {
  org: { id: string; login: string };
  user: { id: number; login: string };
}) {
  if (!isConfigured()) return null;

  let rows: RepoRow[] = [];
  try {
    const token = await listingToken(org.id);
    // The 40 most recently worked on is plenty to find what you're after.
    const repos = (await reposForInstallation(org.id, token)).slice(0, 40);
    const roles = await inBatches(repos, 8, (r) => roleWithToken(token, r.owner, r.name, user));
    rows = toRows(repos.filter((_, i) => roles[i] !== "none"));
  } catch (err) {
    // Uninstalled since they signed in, most likely.
    console.error("[dashboard] org repos", org.login, err);
    return null;
  }
  if (!rows.length) return null;

  const manage = `https://github.com/organizations/${encodeURIComponent(org.login)}/settings/installations/${org.id}`;

  return (
    <section className="mt-10">
      <Heading
        action={
          <a
            href={manage}
            target="_blank"
            rel="noreferrer"
            className="notion-hover flex items-center gap-1 px-1.5 py-0.5 text-[12.5px] text-tertiary hover:text-secondary"
          >
            Choose which projects <ExternalLink className="size-3" />
          </a>
        }
      >
        From {org.login} on GitHub
      </Heading>
      <RepoList repos={rows} />
    </section>
  );
}

/** "From your GitHub" — the projects you've let Codarc see. */
export async function YourRepos({ login, id }: { login: string; id: number }) {
  if (!isConfigured()) {
    return (
      <section className="mt-10">
        <Heading>From your GitHub</Heading>
        <p className="rounded-sm bg-c-gray-bg p-4 text-[13.5px] leading-[1.6] text-secondary">
          Connecting GitHub isn&apos;t switched on here yet. You can still paste
          any public project&apos;s link above.
        </p>
      </section>
    );
  }

  let result: Awaited<ReturnType<typeof load>>;
  try {
    result = await load(login, id);
  } catch (err) {
    console.error("[dashboard] repos", err);
    return (
      <section className="mt-10">
        <Heading>From your GitHub</Heading>
        <p className="rounded-sm bg-c-yellow-bg p-4 text-[13.5px] leading-[1.6] text-secondary">
          GitHub didn&apos;t answer just now, so your projects can&apos;t be listed.
          Reload in a moment — or paste a link above.
        </p>
      </section>
    );
  }

  const connect = `/api/github/install?back=${encodeURIComponent("/dashboard")}`;

  if (!result.installation) {
    return (
      <section className="mt-10">
        <Heading>From your GitHub</Heading>
        <div className="rounded-lg bg-sunken p-5">
          <p className="text-[15px] font-medium text-primary">
            See all your projects here
          </p>
          <p className="mt-1 max-w-[520px] text-[13.5px] leading-[1.6] text-secondary">
            Connect GitHub and tick the projects Codarc may look at — private ones
            too. Nobody else can see them, and you can change your mind any time.
          </p>
          <a href={connect} className="mt-4 inline-block">
            <Button variant="primary" size="lg">
              <GithubMark className="size-3.5" /> Connect GitHub
            </Button>
          </a>
        </div>
      </section>
    );
  }

  // GitHub's own page for changing which projects the app can see.
  const manage = `https://github.com/settings/installations/${result.installation.id}`;

  return (
    <section className="mt-10">
      <Heading
        action={
          <a
            href={manage}
            target="_blank"
            rel="noreferrer"
            className="notion-hover flex items-center gap-1 px-1.5 py-0.5 text-[12.5px] text-tertiary hover:text-secondary"
          >
            Choose which projects <ExternalLink className="size-3" />
          </a>
        }
      >
        From your GitHub
      </Heading>
      {result.rows.length ? (
        <RepoList repos={result.rows} />
      ) : (
        <p className="px-2 text-[13.5px] text-tertiary">
          Codarc is connected, but no projects are ticked yet.
        </p>
      )}
    </section>
  );
}

/** For team members: the owner's projects, which the seat gives you. */
export async function TeamRepos({
  ownerLogin,
  ownerId,
  ownerName,
}: {
  ownerLogin: string;
  ownerId: number;
  ownerName: string;
}) {
  if (!isConfigured()) return null;
  let rows: RepoRow[] = [];
  try {
    rows = (await load(ownerLogin, ownerId)).rows;
  } catch (err) {
    console.error("[dashboard] team repos", err);
    return null;
  }
  if (!rows.length) return null;

  return (
    <section className="mt-10">
      <Heading>From {ownerName}&apos;s GitHub</Heading>
      <RepoList repos={rows} />
    </section>
  );
}

export function ReposLoading({ label }: { label: string }) {
  return (
    <section className="mt-10" aria-busy>
      <Heading>{label}</Heading>
      <div className="space-y-px">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-2 py-1.5">
            <span className="size-7 shrink-0 rounded-sm bg-[rgb(var(--ink)/0.06)]" />
            <span
              className="h-3 rounded-xs bg-[rgb(var(--ink)/0.06)]"
              style={{ width: `${40 + ((i * 17) % 30)}%` }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
