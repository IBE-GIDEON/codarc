"use client";

import * as React from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { KIND_COLOR } from "@/components/workspace/kind";
import { IconButton } from "@/components/ui/button";
import { TREE_H, TREE_W, place, type Tree, type TreeBox } from "@/lib/tree";
import { cn } from "@/lib/cn";

/**
 * Draws the tree. Connectors are elbows — straight down, across, straight
 * down again — which is why an org chart with forty boxes still reads: no
 * line ever cuts diagonally across another box.
 */
function elbow(parent: TreeBox, child: TreeBox) {
  const px = parent.x + TREE_W / 2;
  const py = parent.y + TREE_H;
  const cx = child.x + TREE_W / 2;
  const cy = child.y;
  const midY = py + (cy - py) / 2;
  return `M${px} ${py} V${midY} H${cx} V${cy}`;
}

export function TreeCanvas({
  tree: full,
  selectedId,
  onSelect,
  onOpenFeature,
  matches,
}: {
  tree: Tree;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onOpenFeature: (name: string) => void;
  matches: Set<string> | null;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [view, setView] = React.useState({ x: 0, y: 0, k: 1 });
  const [ready, setReady] = React.useState(false);
  const [smooth, setSmooth] = React.useState(false);
  /*
   * Branches start closed. Opening the whole app at once is forty boxes in a
   * row at 45% zoom, which is the wall of boxes again wearing a tree's
   * clothes. You open the branch you're asking about.
   */
  const [open, setOpen] = React.useState<Set<string>>(() => new Set(["app"]));

  const { visible, links } = React.useMemo(() => {
    const childrenOf = new Map<string, string[]>();
    for (const l of full.links) {
      const kids = childrenOf.get(l.from) ?? [];
      kids.push(l.to);
      childrenOf.set(l.from, kids);
    }

    const shown = new Set<string>(["app"]);
    const queue = ["app"];
    while (queue.length) {
      const id = queue.shift()!;
      if (!open.has(id)) continue;
      for (const kid of childrenOf.get(id) ?? []) {
        if (shown.has(kid)) continue;
        shown.add(kid);
        queue.push(kid);
      }
    }

    const boxes = full.boxes
      .filter((b) => shown.has(b.id))
      .map((b) => ({ ...b }));
    const kept = full.links.filter((l) => shown.has(l.from) && shown.has(l.to));
    place(boxes, kept);
    return { visible: boxes, links: kept };
  }, [full, open]);

  const hasChildren = React.useMemo(() => {
    const set = new Set(full.links.map((l) => l.from));
    return set;
  }, [full.links]);

  const tree = React.useMemo(() => ({ boxes: visible, links }), [visible, links]);

  const bounds = React.useMemo(() => {
    if (!tree.boxes.length) return { x: 0, y: 0, w: 1, h: 1 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const b of tree.boxes) {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + TREE_W);
      maxY = Math.max(maxY, b.y + TREE_H);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [tree.boxes]);

  const fit = React.useCallback(() => {
    const host = hostRef.current;
    if (!host || !tree.boxes.length) return;
    const pad = 56;
    const { width, height } = host.getBoundingClientRect();
    const scale = Math.max(
      0.45,
      Math.min((width - pad * 2) / bounds.w, (height - pad * 2) / bounds.h, 1),
    );
    setView({
      k: scale,
      x: width / 2 - (bounds.x + bounds.w / 2) * scale,
      // Anchored near the top: a tree is read from its root down.
      y: pad - bounds.y * scale,
    });
    setReady(true);
  }, [bounds, tree.boxes.length]);

  const fitted = React.useRef(false);
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const ro = new ResizeObserver(() => {
      if (fitted.current) return;
      const { width, height } = host.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      fitted.current = true;
      fit();
    });
    ro.observe(host);
    return () => ro.disconnect();
  }, [fit]);

  /* ----- panning ----- */
  const pan = React.useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [grabbing, setGrabbing] = React.useState(false);

  function onWheel(e: React.WheelEvent) {
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (e.ctrlKey || e.metaKey) {
      const next = Math.min(2.5, Math.max(0.2, view.k * (1 - e.deltaY * 0.01)));
      setView((v) => ({
        k: next,
        x: px - ((px - v.x) / v.k) * next,
        y: py - ((py - v.y) / v.k) * next,
      }));
    } else {
      setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
    }
  }

  const zoomBy = (factor: number) => {
    const host = hostRef.current;
    if (!host) return;
    const { width, height } = host.getBoundingClientRect();
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.2, v.k * factor));
      return {
        k,
        x: width / 2 - ((width / 2 - v.x) / v.k) * k,
        y: height / 2 - ((height / 2 - v.y) / v.k) * k,
      };
    });
  };

  /** Everything above and below whatever is selected. */
  const lit = React.useMemo(() => {
    if (!selectedId) return new Set<string>();
    const set = new Set([selectedId]);
    const walk = (forward: boolean) => {
      let edge = [selectedId];
      while (edge.length) {
        const next: string[] = [];
        for (const l of tree.links) {
          const here = forward ? l.from : l.to;
          const there = forward ? l.to : l.from;
          if (!edge.includes(here) || set.has(there)) continue;
          set.add(there);
          next.push(there);
        }
        edge = next;
      }
    };
    walk(true);
    walk(false);
    return set;
  }, [selectedId, tree.links]);

  const boxById = React.useMemo(
    () => new Map(tree.boxes.map((b) => [b.id, b])),
    [tree.boxes],
  );

  return (
    <div
      ref={hostRef}
      data-tour="canvas"
      className="canvas-grid relative size-full touch-none overflow-hidden"
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
        setGrabbing(true);
      }}
      onPointerMove={(e) => {
        if (!pan.current) return;
        setView((v) => ({
          ...v,
          x: pan.current!.vx + (e.clientX - pan.current!.x),
          y: pan.current!.vy + (e.clientY - pan.current!.y),
        }));
      }}
      onPointerUp={() => {
        pan.current = null;
        setGrabbing(false);
      }}
      onPointerCancel={() => {
        pan.current = null;
        setGrabbing(false);
      }}
      onWheel={onWheel}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
      style={{ cursor: grabbing ? "grabbing" : "grab" }}
    >
      <div
        className={cn(
          "absolute top-0 left-0 origin-top-left transition-opacity duration-200",
          ready ? "opacity-100" : "opacity-0",
        )}
        style={{
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`,
          transition: smooth ? "transform 440ms var(--ease-soft), opacity 200ms" : undefined,
        }}
      >
        <svg
          className="pointer-events-none absolute overflow-visible"
          style={{ left: 0, top: 0, width: 1, height: 1 }}
          aria-hidden
        >
          {tree.links.map((l) => {
            const a = boxById.get(l.from);
            const b = boxById.get(l.to);
            if (!a || !b) return null;
            const active = lit.has(l.from) && lit.has(l.to);
            return (
              <path
                key={`${l.from}->${l.to}`}
                d={elbow(a, b)}
                fill="none"
                stroke={active ? "var(--accent)" : "var(--text-ghost)"}
                strokeWidth={active ? 1.75 : 1}
                strokeLinejoin="round"
                opacity={selectedId && !active ? 0.25 : 1}
                style={{ transition: "opacity 100ms ease-out" }}
              />
            );
          })}
        </svg>

        {tree.boxes.map((b) => {
          const selected = selectedId === b.id;
          const hit = matches?.has(b.id) ?? false;
          const dimmed = matches ? !hit : Boolean(selectedId) && !lit.has(b.id);

          return (
            <button
              key={b.id}
              data-tour={selected ? "node" : undefined}
              // The background grabs the pointer to pan; without this the box
              // never sees its own click.
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                // A branch opens and closes; a leaf opens its panel.
                if (hasChildren.has(b.id)) {
                  setOpen((prev) => {
                    const next = new Set(prev);
                    if (next.has(b.id)) next.delete(b.id);
                    else next.add(b.id);
                    return next;
                  });
                }
                if (b.node) onSelect(selected ? null : b.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                // Double-clicking a part opens it on its own.
                if (b.featureName) onOpenFeature(b.featureName);
              }}
              className={cn(
                "absolute flex flex-col justify-center rounded-lg px-3 text-left select-none",
                "transition-[box-shadow,opacity] duration-150",
                b.isGroup
                  ? "bg-sunken shadow-[inset_0_0_0_1px_var(--border-strong)]"
                  : "bg-raised shadow-card hover:shadow-popover",
                selected && "shadow-[0_0_0_2px_var(--accent),var(--shadow-popover)]",
                hit && !selected && "shadow-[0_0_0_2px_var(--brand-amber),var(--shadow-popover)]",
                dimmed && "opacity-25",
              )}
              style={{ left: b.x, top: b.y, width: TREE_W, height: TREE_H }}
            >
              <span className="flex items-center gap-2">
                {!b.isGroup && b.node && (
                  <span
                    className="h-3.5 w-[3px] shrink-0 rounded-full"
                    style={{ background: KIND_COLOR[b.node.kind] }}
                  />
                )}
                <span
                  className={cn(
                    "truncate text-[13px]",
                    b.isGroup ? "font-semibold text-primary" : "font-medium text-primary",
                  )}
                >
                  {b.title}
                </span>
                {/* A closed branch says so, and says how much is inside. */}
                {hasChildren.has(b.id) && !open.has(b.id) && (
                  <span className="ml-auto shrink-0 rounded-sm bg-[rgb(var(--ink)/0.07)] px-1.5 text-[10.5px] text-tertiary">
                    +{full.links.filter((l) => l.from === b.id).length}
                  </span>
                )}
              </span>
              {b.subtitle && (
                <span
                  className={cn(
                    "truncate text-[10.5px]",
                    b.isGroup ? "text-tertiary" : "font-mono text-tertiary",
                    !b.isGroup && "pl-[11px]",
                  )}
                >
                  {b.subtitle}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-lg bg-raised/90 p-0.5 shadow-card backdrop-blur-sm">
        <IconButton size="sm" onClick={() => zoomBy(1 / 1.2)} aria-label="Zoom out">
          <Minus className="size-3.5" />
        </IconButton>
        <span className="w-10 text-center font-mono text-[11px] text-tertiary">
          {Math.round(view.k * 100)}%
        </span>
        <IconButton size="sm" onClick={() => zoomBy(1.2)} aria-label="Zoom in">
          <Plus className="size-3.5" />
        </IconButton>
        <IconButton
          size="sm"
          onClick={() => {
            setSmooth(true);
            fit();
            window.setTimeout(() => setSmooth(false), 480);
          }}
          aria-label="Fit the whole tree"
          title="Fit the whole tree"
        >
          <Maximize2 className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}
