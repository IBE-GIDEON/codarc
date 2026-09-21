import { env } from "@/lib/env";
/**
 * Read-only GitHub access. Public repositories need nothing; a private one is
 * read with a short-lived token for that repository alone, which `access.ts`
 * only hands out to its owner and their team.
 */

export class RepoError extends Error {
  constructor(
    message: string,
    readonly hint: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const API = "https://api.github.com";

function headers(repoToken?: string) {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "codarc",
  };
  // GITHUB_TOKEN is optional: it lifts the anonymous 60-an-hour ceiling.
  const token = repoToken ?? env("GITHUB_TOKEN");
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

/**
 * Public answers can be shared between visitors for a few minutes. Anything
 * read with someone's own token never goes in a shared cache at all.
 */
const caching = (repoToken?: string): RequestInit =>
  repoToken ? { cache: "no-store" } : { next: { revalidate: 300 } };

/** Accepts a full URL, "owner/repo", or "github.com/owner/repo". */
export function parseRepoInput(input: string): { owner: string; repo: string } {
  const cleaned = input
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/^(www\.)?github\.com\//, "")
    .replace(/\.git$/, "")
    .replace(/\/+$/, "");

  const [owner, repo] = cleaned.split("/");
  if (!owner || !repo) {
    throw new RepoError(
      "That doesn't look like a repository link",
      "Paste something like github.com/vercel/next.js — the owner, then the repository name.",
    );
  }
  return { owner, repo: repo.replace(/[#?].*$/, "") };
}

export type RepoMeta = {
  defaultBranch: string;
  description: string | null;
  isPrivate: boolean;
};

export async function fetchRepoMeta(
  owner: string,
  repo: string,
  repoToken?: string,
): Promise<RepoMeta> {
  const res = await fetch(`${API}/repos/${owner}/${repo}`, {
    headers: headers(repoToken),
    ...caching(repoToken),
  });

  if (res.status === 404) {
    throw new RepoError(
      `We couldn't find ${owner}/${repo}`,
      "Check the spelling. If the repository is private, you'll need to connect GitHub so Codarc is allowed to see it.",
      404,
    );
  }
  if (res.status === 403 || res.status === 429) {
    throw new RepoError(
      "GitHub is asking us to slow down",
      "We've hit GitHub's limit for anonymous requests. Wait a minute and try again, or connect your GitHub account to lift the limit.",
      429,
    );
  }
  if (!res.ok) {
    throw new RepoError(
      "GitHub didn't answer properly",
      `It replied with a ${res.status}. This is usually temporary — try again in a moment.`,
      502,
    );
  }

  const json = (await res.json()) as {
    default_branch: string;
    description: string | null;
    private: boolean;
  };

  return {
    defaultBranch: json.default_branch ?? "main",
    description: json.description,
    isPrivate: json.private,
  };
}

export type TreeEntry = { path: string; size: number };

export async function fetchTree(
  owner: string,
  repo: string,
  branch: string,
  repoToken?: string,
): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
  const res = await fetch(
    `${API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: headers(repoToken), ...caching(repoToken) },
  );

  if (!res.ok) {
    throw new RepoError(
      "We couldn't read the file list",
      "GitHub wouldn't hand over this repository's files. If it's very large or brand new, try again shortly.",
      502,
    );
  }

  const json = (await res.json()) as {
    tree?: { path: string; type: string; size?: number }[];
    truncated?: boolean;
  };

  const entries = (json.tree ?? [])
    .filter((t) => t.type === "blob")
    .map((t) => ({ path: t.path, size: t.size ?? 0 }));

  return { entries, truncated: Boolean(json.truncated) };
}

const MAX_BYTES = 180_000;

/**
 * Pulls file contents. Public files come from the raw CDN, which is far more
 * generous than the API; private ones come through the API with the token.
 */
export async function fetchFiles(
  owner: string,
  repo: string,
  branch: string,
  paths: string[],
  repoToken?: string,
  concurrency = 12,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  let cursor = 0;

  const urlFor = (path: string) => {
    const encoded = path.split("/").map(encodeURIComponent).join("/");
    return repoToken
      ? `${API}/repos/${owner}/${repo}/contents/${encoded}?ref=${encodeURIComponent(branch)}`
      : `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encoded}`;
  };
  const init: RequestInit = repoToken
    ? {
        headers: { ...headers(repoToken), Accept: "application/vnd.github.raw+json" },
        ...caching(repoToken),
      }
    : { headers: { "User-Agent": "codarc" }, ...caching() };

  async function worker() {
    while (cursor < paths.length) {
      const path = paths[cursor++];
      try {
        const res = await fetch(urlFor(path), init);
        if (!res.ok) continue;
        const text = await res.text();
        if (text.length <= MAX_BYTES) out.set(path, text);
      } catch {
        // A single unreadable file shouldn't sink the whole map.
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, paths.length) }, worker),
  );
  return out;
}
