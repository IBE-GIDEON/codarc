"use client";

import * as React from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import { NODE_H, NODE_W, type GraphNode, type RepoMap } from "@/lib/graph";
import { KIND_COLOR } from "@/components/workspace/kind";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Offsets = Record<string, { dx: number; dy: number }>;

/** A cubic that leaves the right edge and arrives at the left edge. */
function edgePath(a: GraphNode, b: GraphNode, off: Offsets) {
  const leftA = a.x + (off[a.id]?.dx ?? 0);
  const leftB = b.x + (off[b.id]?.dx ?? 0);
  const ay = a.y + (off[a.id]?.dy ?? 0) + NODE_H / 2;
  const by = b.y + (off[b.id]?.dy ?? 0) + NODE_H / 2;

  // One page leading to another sits in the same column, so a straight run
  // would cut through the boxes between them. Those swing out to the left,
  // the way a subway map carries a line past its stops.
  if (Math.abs(leftB - leftA) < NODE_W) {
    const bow = 34 + Math.min(70, Math.abs(by - ay) / 4);
    const x = Math.min(leftA, leftB) - bow;
    return `M${leftA} ${ay} C ${x} ${ay}, ${x} ${by}, ${leftB} ${by}`;
  }

  const ax = leftA + NODE_W;
  const mid = Math.max(28, (leftB - ax) / 2);
  return `M${ax} ${ay} C ${ax + mid} ${ay}, ${leftB - mid} ${by}, ${leftB} ${by}`;
}

export type CanvasHandle = {
  focusNode: (id: string) => void;
  /** Re-frames whatever is on screen now — used when the view changes. */
  fitAll: () => void;
};

export function Canvas({
  map,
  selectedId,
  onSelect,
  storageKey,
  matches,
  initialOffsets,
  onWorldPointer,
  overlay,
  ref,
}: {
  ref?: React.Ref<CanvasHandle>;
  /**
   * Where the pointer is in *map* coordinates, or null when it leaves.
   * Map coordinates, not screen ones, so two people zoomed differently still
   * agree on which box a cursor is over.
   */
  onWorldPointer?: (point: { x: number; y: number } | null) => void;
  /** Drawn inside the map layer; given the zoom so it can stay screen-sized. */
  overlay?: (zoom: number) => React.ReactNode;
  /** Someone else's arrangement to start from — a shared map. */
  initialOffsets?: Offsets;
  map: RepoMap;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  storageKey: string;
  /** Ids matching the current search, or null when nothing is searched. */
  matches: Set<string> | null;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [view, setView] = React.useState({ x: 0, y: 0, k: 1 });
  const [ready, setReady] = React.useState(false);

  // Hand-placed nodes are the user's work — keep them across re-scans.
  // Safe to read during init: this component only mounts after the map loads.
  const [offsets, setOffsets] = React.useState<Offsets>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as Offsets;
    } catch {}
    // Nothing saved yet: start from whatever arrangement we were handed.
    return initialOffsets ?? {};
  });

  const persist = React.useCallback(
    (next: Offsets) => {
      setOffsets(next);
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    },
    [storageKey],
  );

  const bounds = React.useMemo(() => {
    if (!map.nodes.length) return { x: 0, y: 0, w: 1, h: 1 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of map.nodes) {
      const x = n.x + (offsets[n.id]?.dx ?? 0);
      const y = n.y + (offsets[n.id]?.dy ?? 0);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + NODE_W);
      maxY = Math.max(maxY, y + NODE_H);
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }, [map.nodes, offsets]);

  const fit = React.useCallback(() => {
    const host = hostRef.current;
    if (!host || !map.nodes.length) return;
    const pad = 64;
    const { width, height } = host.getBoundingClientRect();
    const k = Math.min(
      (width - pad * 2) / bounds.w,
      (height - pad * 2) / bounds.h,
      1.1,
    );
    // Never open so far out that the labels are unreadable — better to start
    // legible and let people pan than to show a wall of grey rectangles.
    const scale = Math.max(0.68, k);

    // Centre when it fits; otherwise anchor to the top-left, because the map
    // reads left to right and the story starts there.
    const fitsX = bounds.w * scale <= width - pad * 2;
    const fitsY = bounds.h * scale <= height - pad * 2;

    setView({
      k: scale,
      x: fitsX
        ? width / 2 - (bounds.x + bounds.w / 2) * scale
        : pad - bounds.x * scale,
      y: fitsY
        ? height / 2 - (bounds.y + bounds.h / 2) * scale
        : pad - bounds.y * scale,
    });
    setReady(true);
  }, [bounds, map.nodes.length]);

  // Fit once the container has a real size. Measuring through an observer
  // keeps this out of the effect body and survives a late layout.
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

  /* ----- panning the background ----- */
  const pan = React.useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const drag = React.useRef<{ id: string; x: number; y: number; dx: number; dy: number } | null>(null);
  const [grabbing, setGrabbing] = React.useState(false);

  function onPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    setGrabbing(true);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (onWorldPointer && hostRef.current) {
      const rect = hostRef.current.getBoundingClientRect();
      onWorldPointer({
        x: (e.clientX - rect.left - view.x) / view.k,
        y: (e.clientY - rect.top - view.y) / view.k,
      });
    }
    if (drag.current) {
      const d = drag.current;
      persistLive(d.id, d.dx + (e.clientX - d.x) / view.k, d.dy + (e.clientY - d.y) / view.k);
      return;
    }
    if (!pan.current) return;
    setView((v) => ({
      ...v,
      x: pan.current!.vx + (e.clientX - pan.current!.x),
      y: pan.current!.vy + (e.clientY - pan.current!.y),
    }));
  }

  function persistLive(id: string, dx: number, dy: number) {
    setOffsets((prev) => ({ ...prev, [id]: { dx, dy } }));
  }

  function onPointerUp() {
    if (drag.current) persist(offsets);
    pan.current = null;
    drag.current = null;
    setGrabbing(false);
  }

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

  function zoomBy(factor: number) {
    const host = hostRef.current;
    if (!host) return;
    const { width, height } = host.getBoundingClientRect();
    const next = Math.min(2.5, Math.max(0.2, view.k * factor));
    setView((v) => ({
      k: next,
      x: width / 2 - ((width / 2 - v.x) / v.k) * next,
      y: height / 2 - ((height / 2 - v.y) / v.k) * next,
    }));
  }

  const nodeById = React.useMemo(
    () => new Map(map.nodes.map((n) => [n.id, n])),
    [map.nodes],
  );

  // Glide to a node when it's picked from the sidebar or a search result.
  // Only when it's actually out of view — a jump that wasn't needed is worse
  // than no jump at all.
  const [smooth, setSmooth] = React.useState(false);

  React.useImperativeHandle(
    ref,
    () => ({
      fitAll() {
        setSmooth(true);
        fit();
        window.setTimeout(() => setSmooth(false), 480);
      },
      focusNode(id: string) {
        const host = hostRef.current;
        const n = nodeById.get(id);
        if (!host || !n) return;

        const { width, height } = host.getBoundingClientRect();
        const cx = n.x + (offsets[id]?.dx ?? 0) + NODE_W / 2;
        const cy = n.y + (offsets[id]?.dy ?? 0) + NODE_H / 2;
        const sx = cx * view.k + view.x;
        const sy = cy * view.k + view.y;

        const inView =
          sx > 90 && sx < width - 380 && sy > 90 && sy < height - 90;
        if (inView) return;

        setSmooth(true);
        setView((v) => ({
          ...v,
          x: Math.min(width / 2, width - 380) - cx * v.k,
          y: height / 2 - cy * v.k,
        }));
        window.setTimeout(() => setSmooth(false), 480);
      },
    }),
    [fit, nodeById, offsets, view.k, view.x, view.y],
  );

  const neighbours = React.useMemo(() => {
    if (!selectedId) return new Set<string>();
    const s = new Set<string>();
    for (const e of map.edges) {
      if (e.from === selectedId) s.add(e.to);
      if (e.to === selectedId) s.add(e.from);
    }
    return s;
  }, [selectedId, map.edges]);

  return (
    <div
      ref={hostRef}
      data-tour="canvas"
      className="canvas-grid relative size-full touch-none overflow-hidden"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={() => onWorldPointer?.(null)}
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
          transition: smooth
            ? "transform 440ms var(--ease-soft), opacity 200ms"
            : undefined,
        }}
      >
        <svg
          className="pointer-events-none absolute overflow-visible"
          style={{ left: 0, top: 0, width: 1, height: 1 }}
          aria-hidden
        >
          <defs>
            {/* One arrowhead per colour: a line that means "goes to" should
                say which way it goes. */}
            {[
              ["arrow-quiet", "var(--text-tertiary)"],
              ["arrow-live", "var(--accent)"],
            ].map(([id, colour]) => (
              <marker
                key={id}
                id={id}
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0 1 L7 4 L0 7 z" fill={colour} />
              </marker>
            ))}
          </defs>
          {map.edges.map((e) => {
            const a = nodeById.get(e.from);
            const b = nodeById.get(e.to);
            if (!a || !b) return null;
            const active = selectedId === e.from || selectedId === e.to;
            // A link someone can click is drawn as a solid line with an
            // arrow. Everything else is the app reaching for something
            // behind the scenes, and stays a quiet dotted line.
            const opens = e.kind === "opens";
            return (
              <path
                key={`${e.from}->${e.to}`}
                d={edgePath(a, b, offsets)}
                fill="none"
                strokeLinecap="round"
                stroke={
                  active
                    ? "var(--accent)"
                    : opens
                      ? "var(--text-tertiary)"
                      : "var(--text-ghost)"
                }
                strokeWidth={active ? 2 : opens ? 1.5 : 1.25}
                strokeDasharray={opens || active ? undefined : "1 5"}
                markerEnd={opens ? `url(#${active ? "arrow-live" : "arrow-quiet"})` : undefined}
                // With something selected, the rest of the map steps back so
                // one path can be followed without losing it in the others.
                opacity={selectedId && !active ? 0.25 : 1}
                style={{ transition: "opacity 100ms ease-out" }}
              />
            );
          })}
        </svg>

        {map.nodes.map((n) => {
          const dx = offsets[n.id]?.dx ?? 0;
          const dy = offsets[n.id]?.dy ?? 0;
          const selected = selectedId === n.id;
          const hit = matches?.has(n.id) ?? false;
          // Search wins over selection for what gets dimmed — while you're
          // looking for something, that's the only question on your mind.
          const dimmed = matches
            ? !hit
            : Boolean(selectedId) && !selected && !neighbours.has(n.id);
          // Addresses mean something to everyone; file names mean nothing to
          // the people Codarc is for.
          const second =
            n.kind === "screen"
              ? n.code
              : n.kind === "door"
                ? // "POST /api/change" is two ideas, and the first one is
                  // programmer's grammar. The address alone is enough.
                  n.code.replace(/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+/i, "")
                : null;

          return (
            <div
              key={n.id}
              data-tour={selected ? "node" : undefined}
              role="button"
              tabIndex={0}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                drag.current = { id: n.id, x: e.clientX, y: e.clientY, dx, dy };
              }}
              onPointerMove={onPointerMove}
              onPointerUp={(e) => {
                e.stopPropagation();
                const moved =
                  drag.current &&
                  (Math.abs(offsets[n.id]?.dx ?? 0) !== Math.abs(dx) ||
                    Math.abs(offsets[n.id]?.dy ?? 0) !== Math.abs(dy));
                onPointerUp();
                if (!moved) onSelect(selected ? null : n.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(n.id);
              }}
              className={cn(
                "absolute flex cursor-pointer items-center gap-2.5 rounded-lg bg-raised px-3 py-2 select-none",
                "transition-[box-shadow,opacity] duration-150",
                selected
                  ? "shadow-[0_0_0_2px_var(--accent),var(--shadow-popover)]"
                  : hit
                    ? "shadow-[0_0_0_2px_var(--brand-amber),var(--shadow-popover)]"
                    : "shadow-card hover:shadow-popover",
                dimmed && "opacity-25",
              )}
              style={{
                left: n.x + dx,
                top: n.y + dy,
                width: NODE_W,
                height: NODE_H,
              }}
            >
              <span
                className="h-7 w-[6px] shrink-0 rounded-full"
                style={{ background: KIND_COLOR[n.kind] }}
              />
              <span className="min-w-0">
                <span
                  className={cn(
                    "block truncate text-[13px] font-medium text-primary",
                    // Nothing underneath, so the name sits in the middle.
                    !second && "leading-[1.3]",
                  )}
                >
                  {n.title}
                </span>
                {/* A page's address is worth showing — people recognise
                    "/pricing". A file name isn't; that belongs on the panel
                    for anyone who asks for it. */}
                {second && (
                  <span className="block truncate font-mono text-[10.5px] text-tertiary">
                    {second}
                  </span>
                )}
              </span>
            </div>
          );
        })}

        {overlay?.(view.k)}
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
        <IconButton size="sm" onClick={fit} aria-label="Fit to screen" title="Fit to screen">
          <Maximize2 className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}
