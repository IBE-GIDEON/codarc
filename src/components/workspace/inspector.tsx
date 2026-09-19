"use client";

import * as React from "react";
import { ArrowRight, FileCode2, Lock, X } from "lucide-react";
import type { GraphNode, RepoMap } from "@/lib/graph";
import { KIND_LEGEND, KIND_COLOR } from "@/components/workspace/kind";
import { Button, IconButton } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[11px] font-medium text-tertiary">{children}</div>
  );
}

export function Inspector({
  node,
  map,
  onClose,
}: {
  node: GraphNode;
  map: RepoMap;
  onClose: () => void;
}) {
  // The parent keys this by node id, so selecting another node remounts and
  // the draft resets on its own.
  const [draft, setDraft] = React.useState("");
  const [asked, setAsked] = React.useState(false);
  const legend = KIND_LEGEND.find((l) => l.kind === node.kind);

  const href = `https://github.com/${map.owner}/${map.repo}/blob/${map.branch}/${node.file}#L${node.line}`;

  return (
    <aside className="pointer-events-auto flex max-h-full w-[340px] flex-col overflow-hidden rounded-xl bg-raised shadow-popover">
      <div className="flex items-start gap-2.5 px-4 pt-4">
        <span
          className="mt-0.5 h-8 w-[6px] shrink-0 rounded-full"
          style={{ background: KIND_COLOR[node.kind] }}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-primary">
            {node.title}
          </h2>
          <p className="truncate font-mono text-[11px] text-tertiary">
            {node.code}
          </p>
        </div>
        <IconButton size="sm" onClick={onClose} aria-label="Close">
          <X className="size-3.5" />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-1">
        <p className="text-[13.5px] leading-[1.55] text-primary">
          {node.summary}
        </p>
        {legend && (
          <p className="mt-2 text-[12.5px] leading-[1.5] text-tertiary">
            {legend.hint}
          </p>
        )}

        <div className="mt-5">
          <Label>Where this lives</Label>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="notion-hover -mx-1.5 flex items-center gap-2 px-1.5 py-1"
          >
            <FileCode2 className="size-3.5 shrink-0 text-tertiary" />
            <span className="truncate font-mono text-[12px] text-secondary">
              {node.file}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[11px] text-ghost">
              line {node.line}
            </span>
          </a>
        </div>

        {node.related.length > 0 && (
          <div className="mt-4">
            <Label>What it reaches into</Label>
            <div className="space-y-px">
              {node.related.map((r) => (
                <div
                  key={r}
                  className="notion-hover -mx-1.5 truncate px-1.5 py-1 font-mono text-[11.5px] text-tertiary"
                >
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <Label>Change it</Label>
          <Textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Say what this should do differently, in your own words."
            className="text-[13px]"
          />
          <p className="mt-1.5 text-[11.5px] leading-[1.45] text-tertiary">
            You never have to say <em>where</em> — Codarc already knows this is{" "}
            <span className="font-mono">{node.file.split("/").pop()}</span>.
          </p>
        </div>
      </div>

      <div className="px-4 pt-3 pb-4">
        {asked ? (
          <div className="rounded-sm bg-c-blue-bg p-3">
            <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-primary">
              <Lock className="size-3.5" /> Connect GitHub to continue
            </div>
            <p className="mt-1 text-[12px] leading-[1.5] text-secondary">
              Codarc can read this repository because it&apos;s public. To write
              the change and open a pull request, it needs your permission on
              the repository itself.
            </p>
            <Button variant="primary" size="md" className="mt-2.5 w-full">
              Connect GitHub <ArrowRight className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!draft.trim()}
            onClick={() => setAsked(true)}
          >
            Draft the change <ArrowRight className="size-3.5" />
          </Button>
        )}
      </div>
    </aside>
  );
}
