import crypto from "node:crypto";
import fs from "node:fs";
import { env, hasEnv } from "@/lib/env";

/**
 * GitHub App auth. The app signs a short JWT with its private key, swaps that
 * for an installation token, and acts as itself on the repos the user picked —
 * which is what lets the landing page promise "only the projects you pick".
 */

export class GithubAppError extends Error {
  constructor(
    message: string,
    readonly hint: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

function privateKey(): string {
  const path = env("GITHUB_APP_PRIVATE_KEY_PATH");
  if (path) {
    try {
      return fs.readFileSync(path, "utf8");
    } catch {
      throw new GithubAppError(
        "Codarc can't read its GitHub key",
        `GITHUB_APP_PRIVATE_KEY_PATH points at ${path}, which isn't there.`,
        503,
      );
    }
  }

  const inline = env("GITHUB_APP_PRIVATE_KEY");
  if (!inline) {
    throw new GithubAppError(
      "Codarc isn't connected to GitHub yet",
      "The server is missing its GitHub App keys. Add them where this is hosted, then redeploy. See SETUP-GITHUB.md.",
      503,
    );
  }
  // .env files can't hold real newlines, so they arrive as literal \n.
  return inline.includes("\\n") ? inline.replace(/\\n/g, "\n") : inline;
}

export function isConfigured() {
  return (
    hasEnv("GITHUB_APP_ID") &&
    (hasEnv("GITHUB_APP_PRIVATE_KEY") || hasEnv("GITHUB_APP_PRIVATE_KEY_PATH"))
  );
}

const b64 = (input: string | Buffer) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

/** RS256, signed with node:crypto so we don't pull in a JWT dependency. */
function appJwt(): string {
  const appId = env("GITHUB_APP_ID");
  if (!appId) {
    throw new GithubAppError(
      "Codarc isn't connected to GitHub yet",
      "GITHUB_APP_ID is missing. See SETUP-GITHUB.md.",
      503,
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64(
    // 60s back-dated for clock skew; GitHub rejects anything over 10 minutes.
    JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId }),
  );

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${payload}`);
  const signature = b64(signer.sign(privateKey()));

  return `${header}.${payload}.${signature}`;
}

async function api<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "codarc",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string>),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new GithubAppError(
        "GitHub wouldn't let us in",
        "Codarc's permission on this repository may have been removed. Reconnect it and try again.",
        403,
      );
    }
    if (res.status === 404) {
      throw new GithubAppError(
        "GitHub couldn't find that",
        "Codarc may not be installed on this repository. Install it, then try again.",
        404,
      );
    }
    throw new GithubAppError(
      "GitHub turned the change down",
      `It replied with a ${res.status}. ${detail.slice(0, 160)}`,
      502,
    );
  }

  return res.json() as Promise<T>;
}

/** The app's URL slug, used to build the install link. */
export async function appSlug(): Promise<string> {
  const app = await api<{ slug: string }>("/app", appJwt());
  return app.slug;
}

export async function installationToken(installationId: string) {
  const res = await api<{ token: string }>(
    `/app/installations/${installationId}/access_tokens`,
    appJwt(),
    { method: "POST" },
  );
  return res.token;
}

/** Which installation covers this repo, if any. */
export async function installationForRepo(owner: string, repo: string) {
  try {
    const res = await api<{ id: number }>(
      `/repos/${owner}/${repo}/installation`,
      appJwt(),
    );
    return String(res.id);
  } catch {
    return null;
  }
}

export type NewFile = { path: string; content: string };

/**
 * Creates a branch, commits the files onto it, and opens a pull request.
 * Uses the git data API so every file lands in a single commit.
 */
export async function openPullRequest({
  token,
  owner,
  repo,
  base,
  title,
  body,
  files,
}: {
  token: string;
  owner: string;
  repo: string;
  base: string;
  title: string;
  body: string;
  files: NewFile[];
}) {
  const repoPath = `/repos/${owner}/${repo}`;

  const baseRef = await api<{ object: { sha: string } }>(
    `${repoPath}/git/ref/heads/${encodeURIComponent(base)}`,
    token,
  );
  const baseSha = baseRef.object.sha;

  const baseCommit = await api<{ tree: { sha: string } }>(
    `${repoPath}/git/commits/${baseSha}`,
    token,
  );

  const blobs = await Promise.all(
    files.map(async (f) => {
      const blob = await api<{ sha: string }>(`${repoPath}/git/blobs`, token, {
        method: "POST",
        body: JSON.stringify({
          content: Buffer.from(f.content, "utf8").toString("base64"),
          encoding: "base64",
        }),
      });
      return { path: f.path, sha: blob.sha };
    }),
  );

  const tree = await api<{ sha: string }>(`${repoPath}/git/trees`, token, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseCommit.tree.sha,
      tree: blobs.map((b) => ({
        path: b.path,
        mode: "100644",
        type: "blob",
        sha: b.sha,
      })),
    }),
  });

  const commit = await api<{ sha: string }>(`${repoPath}/git/commits`, token, {
    method: "POST",
    body: JSON.stringify({
      message: title,
      tree: tree.sha,
      parents: [baseSha],
    }),
  });

  const branch = `codarc/${Date.now().toString(36)}`;
  await api(`${repoPath}/git/refs`, token, {
    method: "POST",
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commit.sha }),
  });

  const pr = await api<{ html_url: string; number: number }>(
    `${repoPath}/pulls`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ title, body, head: branch, base }),
    },
  );

  return { url: pr.html_url, number: pr.number, branch };
}
