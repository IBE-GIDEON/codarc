"use client";

import * as React from "react";
import { ChevronRight, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import type { GraphNode, RepoMap } from "@/lib/graph";
import { computeImpact, things, type Risk } from "@/lib/impact";
import { KIND_COLOR } from "@/components/workspace/kind";
import { cn } from "@/lib/cn";

const LOOK: Record<
  Risk,
  { icon: typeof ShieldCheck; tint: string; text: string; label: string }
> = {
  safe: {
    icon: ShieldCheck,
    tint: "bg-c-green-bg",
    text: "text-c-green",
    label: "Safe to change",
  },
  care: {
    icon: TriangleAlert,
    tint: "bg-c-yellow-bg",
    text: "text-c-yellow",
    label: "Worth a look first",
  },
  careful: {
    icon: ShieldAlert,
    tint: "bg-c-red-bg",
    text: "text-c-red",
    label: "Change this carefully",
  },
};

function Row({ node, onSelect }: { node: GraphNode; onSelect: (id: string) => void }) {
  return (
    <button
      onClick={() => onSelect(node.id)}
      className="notion-hover -mx-1.5 flex w-[calc(100%+12px)] items-center gap-2 px-1.5 py-1 text-left"
    >
      <span
        className="h-3.5 w-[3px] shrink-0 rounded-full"
        style={{ background: KIND_COLOR[node.kind] }}
      />
      <span className="truncate text-[12.5px] text-secondary">{node.title}</span>
    </button>
  );
}

export function ImpactPanel({
  map,
  node,
  onSelect,
}: {
  map: RepoMap;
  node: GraphNode;
  onSelect: (id: string) => void;
}) {
  const impact = React.useMemo(() => computeImpact(map, node.id), [map, node.id]);
  const [showKnockOn, setShowKnockOn] = React.useState(false);
  const look = LOOK[impact.risk];
  const Icon = look.icon;

  return (
    <div className="mt-5" data-tour="impact">
      <div className="mb-1.5 text-[11px] font-medium text-tertiary">
        If you change this
      </div>

      <div className={cn("rounded-sm p-3", look.tint)}>
        <div className="flex items-center gap-1.5">
          <Icon className={cn("size-3.5 shrink-0", look.text)} strokeWidth={2.25} />
          <span className="text-[12.5px] font-medium text-primary">
            {look.label}
          </span>
          {impact.total > 0 && (
            <span className="ml-auto text-[11.5px] text-secondary">
              {things(impact.total)} affected
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[12.5px] leading-[1.5] text-secondary">
          {impact.verdict}
        </p>
      </div>

      {impact.direct.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[11px] font-medium text-tertiary">
            Uses this directly
          </div>
          <div className="space-y-px">
            {impact.direct.map((n) => (
              <Row key={n.id} node={n} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}

      {impact.knockOn.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowKnockOn((v) => !v)}
            className="notion-hover -mx-1.5 flex w-[calc(100%+12px)] items-center gap-1 px-1.5 py-1"
          >
            <ChevronRight
              className={cn(
                "size-3 shrink-0 text-tertiary transition-transform duration-150",
                showKnockOn && "rotate-90",
              )}
            />
            <span className="text-[11px] font-medium text-tertiary">
              {things(impact.knockOn.length)} further down the chain
            </span>
          </button>
          {showKnockOn && (
            <div className="space-y-px pl-3">
              {impact.knockOn.map((n) => (
                <Row key={n.id} node={n} onSelect={onSelect} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
