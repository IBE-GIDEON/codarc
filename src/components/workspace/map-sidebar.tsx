"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { GraphNode, NodeKind, RepoMap } from "@/lib/graph";
import { KIND_LEGEND, KIND_COLOR } from "@/components/workspace/kind";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/cn";

export function MapSidebar({
  map,
  selectedId,
  onSelect,
}: {
  map: RepoMap;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const grouped = React.useMemo(() => {
    const g = new Map<NodeKind, GraphNode[]>();
    for (const n of map.nodes) {
      const list = g.get(n.kind) ?? [];
      list.push(n);
      g.set(n.kind, list);
    }
    return g;
  }, [map.nodes]);

  const trimmed =
    Object.values(map.stats.found).reduce((a, b) => a + b, 0) - map.nodes.length;

  const [open, setOpen] = React.useState<Record<string, boolean>>({
    screen: true,
    door: true,
    logic: false,
    data: false,
  });

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-sidebar">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2">
        <Link href="/" aria-label="Codarc home">
          <Logo className="size-5 shrink-0 text-primary" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-medium text-primary">
            {map.repo}
          </div>
          <div className="truncate text-[11px] text-tertiary">{map.owner}</div>
        </div>
        <ThemeToggle />
      </div>

      {map.stacks.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pb-3">
          {map.stacks.map((s) => (
            <span
              key={s}
              className="rounded-sm bg-[rgb(var(--ink)/0.06)] px-1.5 py-0.5 text-[11px] text-secondary"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-2">
        {KIND_LEGEND.map(({ kind, label, hint }) => {
          const list = grouped.get(kind) ?? [];
          if (!list.length) return null;
          const isOpen = open[kind];

          return (
            <div key={kind} className="mb-1">
              <button
                onClick={() => setOpen((o) => ({ ...o, [kind]: !o[kind] }))}
                className="notion-hover flex h-[27px] w-full items-center gap-1.5 px-2 text-left"
                title={hint}
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 shrink-0 text-tertiary transition-transform duration-150",
                    isOpen && "rotate-90",
                  )}
                />
                <span
                  className="h-3 w-[4px] shrink-0 rounded-full"
                  style={{ background: KIND_COLOR[kind] }}
                />
                <span className="text-[13px] font-medium text-secondary">
                  {label}
                </span>
                <span className="ml-auto font-mono text-[11px] text-ghost">
                  {map.stats.found[kind] > list.length
                    ? `${list.length}/${map.stats.found[kind]}`
                    : list.length}
                </span>
              </button>

              {isOpen &&
                list.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onSelect(n.id)}
                    className={cn(
                      "flex h-[27px] w-full items-center rounded-sm pr-2 pl-[30px] text-left",
                      "transition-[background] duration-[20ms] ease-in",
                      selectedId === n.id
                        ? "bg-active font-medium text-primary"
                        : "text-secondary hover:bg-hover",
                    )}
                  >
                    <span className="truncate text-[13px]">{n.title}</span>
                  </button>
                ))}
            </div>
          );
        })}
      </div>

      <div className="px-3 py-2.5 text-[11px] leading-[1.5] text-tertiary shadow-[inset_0_1px_0_0_var(--border)]">
        Read {map.stats.filesScanned} of {map.stats.filesTotal} files on{" "}
        <span className="font-mono">{map.branch}</span>.
        {trimmed > 0 && (
          <>
            {" "}
            Showing the {map.nodes.length} busiest pieces — {trimmed} quieter
            ones are hidden to keep the map readable.
          </>
        )}
      </div>
    </aside>
  );
}
