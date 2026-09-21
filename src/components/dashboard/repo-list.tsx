"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, BookMarked, Lock, Search } from "lucide-react";

export type RepoRow = {
  owner: string;
  name: string;
  isPrivate: boolean;
  description: string | null;
  /** Worked out on the server so both renders agree. */
  updated: string;
};

const FIRST = 8;

/** A Notion-style list of projects: hover a row, click to open its map. */
export function RepoList({ repos }: { repos: RepoRow[] }) {
  const [query, setQuery] = React.useState("");
  const [all, setAll] = React.useState(false);

  const q = query.trim().toLowerCase();
  const matching = q
    ? repos.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q),
      )
    : repos;
  const shown = all || q ? matching : matching.slice(0, FIRST);

  return (
    <div>
      {repos.length > FIRST && (
        <label className="mb-2 flex h-control items-center gap-2 rounded-md px-2 text-tertiary shadow-[inset_0_0_0_1px_var(--border)] focus-within:text-secondary">
          <Search className="size-3.5 shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a project"
            aria-label="Find a project"
            className="h-full min-w-0 flex-1 bg-transparent text-[13.5px] text-primary placeholder:text-tertiary focus:outline-none"
          />
        </label>
      )}

      <div className="space-y-px">
        {shown.map((r) => (
          <Link
            key={`${r.owner}/${r.name}`}
            href={`/r/${r.owner}/${r.name}`}
            prefetch={false}
            className="reveal-parent notion-hover flex items-center gap-3 px-2 py-1.5"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-sm bg-[rgb(var(--ink)/0.06)] text-tertiary">
              {r.isPrivate ? <Lock className="size-3.5" /> : <BookMarked className="size-3.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] text-primary">{r.name}</span>
              {r.description && (
                <span className="block truncate text-[12px] text-tertiary">{r.description}</span>
              )}
            </span>
            <span className="shrink-0 text-[12px] text-tertiary">{r.updated}</span>
            <span className="reveal flex shrink-0 items-center gap-1 text-[12.5px] text-secondary">
              Open map <ArrowRight className="size-3.5" />
            </span>
          </Link>
        ))}
      </div>

      {q && matching.length === 0 && (
        <p className="px-2 py-3 text-[13px] text-tertiary">Nothing called that.</p>
      )}

      {!q && !all && repos.length > FIRST && (
        <button
          onClick={() => setAll(true)}
          className="notion-hover mt-1 px-2 py-1 text-[13px] text-tertiary hover:text-secondary"
        >
          Show all {repos.length}
        </button>
      )}
    </div>
  );
}
