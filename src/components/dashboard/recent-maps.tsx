"use client";

import Link from "next/link";
import { Lock, X } from "lucide-react";
import { forgetMap, useRecentMaps } from "@/lib/recent";
import { ago } from "@/lib/ago";
import { KIND_COLOR } from "@/components/workspace/kind";
import { KIND_ORDER } from "@/lib/graph";

/** A tiny picture of a map: four columns of boxes in the legend colours. */
function Thumb() {
  const rows = [3, 2, 3, 2];
  return (
    <div className="flex h-14 items-center justify-center gap-2.5 rounded-t-lg bg-sunken">
      {KIND_ORDER.map((kind, i) => (
        <div key={kind} className="flex flex-col gap-1">
          {Array.from({ length: rows[i] }).map((_, r) => (
            <span
              key={r}
              className="h-1.5 w-5 rounded-xs opacity-70"
              style={{ background: KIND_COLOR[kind] }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function RecentMaps() {
  const recent = useRecentMaps();
  if (recent.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-2 text-[14px] font-medium text-secondary">Recently opened</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {recent.slice(0, 6).map((r) => (
          <div key={`${r.owner}/${r.repo}`} className="reveal-parent relative">
            <Link
              href={`/r/${r.owner}/${r.repo}`}
              prefetch={false}
              className="block rounded-lg bg-raised shadow-card transition-[background] duration-[20ms] ease-in hover:bg-hover"
            >
              <Thumb />
              <div className="px-3 pt-2.5 pb-3">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-[14px] font-medium text-primary">{r.repo}</span>
                  {r.isPrivate && <Lock className="size-3 shrink-0 text-tertiary" />}
                </div>
                <div className="truncate text-[12px] text-tertiary">
                  {r.owner} · {ago(r.at)}
                </div>
              </div>
            </Link>
            <button
              onClick={() => forgetMap(r)}
              aria-label={`Remove ${r.repo} from this list`}
              title="Remove from this list"
              className="reveal absolute top-1.5 right-1.5 grid size-6 place-items-center rounded-sm bg-raised/90 text-tertiary hover:bg-hover hover:text-primary"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
