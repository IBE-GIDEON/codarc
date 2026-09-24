"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";
import type { RepoMap } from "@/lib/graph";
import { KIND_COLOR } from "@/components/workspace/kind";
import type { Feature } from "@/lib/features";
import { cn } from "@/lib/cn";

/**
 * The first thing anyone sees: what their app is made of, in six or eight
 * parts. Not files, not addresses — the areas they'd name themselves if you
 * asked them what their app does.
 *
 * Pick one and the map opens on that part alone. Everything deeper waits
 * until it's asked for.
 */
export function Overview({
  map,
  features,
  onOpen,
}: {
  map: RepoMap;
  features: Feature[];
  onOpen: (feature: Feature) => void;
}) {
  const [hovered, setHovered] = React.useState<string | null>(null);
  const related = React.useMemo(() => {
    if (!hovered) return new Set<string>();
    const here = features.find((f) => f.name === hovered);
    const set = new Set<string>(here?.uses ?? []);
    for (const f of features) if (f.uses.includes(hovered)) set.add(f.name);
    return set;
  }, [hovered, features]);

  const totals = map.nodes.reduce(
    (acc, n) => ({ ...acc, [n.kind]: (acc[n.kind] ?? 0) + 1 }),
    {} as Record<string, number>,
  );

  return (
    <div className="size-full overflow-y-auto px-6 py-10">
      <div className="mx-auto w-full max-w-[860px]">
        <h1 className="text-[26px] leading-[1.2] font-bold tracking-[-0.02em] text-primary">
          What {map.repo} is made of
        </h1>
        <p className="mt-2 max-w-[62ch] text-[15px] leading-[1.6] text-secondary">
          {map.overview}
        </p>
        <p className="mt-3 text-[13px] text-tertiary">
          {features.length} parts · {totals.screen ?? 0} pages ·{" "}
          {totals.door ?? 0} places requests come in · {totals.logic ?? 0} pieces
          behind the scenes
        </p>

        <div data-tour="parts" className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <button
              key={f.name}
              onMouseEnter={() => setHovered(f.name)}
              onMouseLeave={() => setHovered((h) => (h === f.name ? null : h))}
              onFocus={() => setHovered(f.name)}
              onBlur={() => setHovered((h) => (h === f.name ? null : h))}
              onClick={() => onOpen(f)}
              className={cn(
                "reveal-parent flex flex-col rounded-lg bg-raised p-4 text-left shadow-card",
                "transition-[box-shadow,opacity] duration-150 hover:shadow-popover",
                // Pointing at one part shows what it works with, without a
                // single line being drawn.
                hovered && hovered !== f.name && !related.has(f.name) && "opacity-40",
                related.has(f.name) && "shadow-[0_0_0_1.5px_var(--accent),var(--shadow-card)]",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="flex gap-[3px]">
                  {(["screen", "door", "logic", "data"] as const)
                    .filter((k) => f.counts[k] > 0)
                    .map((k) => (
                      <span
                        key={k}
                        className="h-3.5 w-[3px] rounded-full"
                        style={{ background: KIND_COLOR[k] }}
                      />
                    ))}
                </span>
                <span className="truncate text-[15px] font-medium text-primary">
                  {f.name}
                </span>
                <ArrowRight className="reveal ml-auto size-3.5 shrink-0 text-tertiary" />
              </span>

              <span className="mt-1.5 text-[12.5px] leading-[1.5] text-tertiary">
                {f.summary}
              </span>

              {f.uses.length > 0 && (
                <span className="mt-3 text-[12px] leading-[1.5] text-secondary">
                  Works with {f.uses.slice(0, 3).join(", ")}
                  {f.uses.length > 3 && ` and ${f.uses.length - 3} more`}
                </span>
              )}
            </button>
          ))}
        </div>

        <p className="mt-6 text-[12.5px] text-tertiary">
          Point at a part to see what it works with. Click it to go inside.
        </p>
      </div>
    </div>
  );
}
