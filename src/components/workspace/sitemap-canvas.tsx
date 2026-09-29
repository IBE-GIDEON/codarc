"use client";

import * as React from "react";
import { Maximize2, Minus, Plus } from "lucide-react";
import type { NodeKind } from "@/lib/graph";
import { CARD_W, type PageCard, type Sitemap } from "@/lib/sitemap";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * The site map: a card per page, what's inside it listed in the card, the
 * structure drawn in straight elbows beneath, and the links someone can
 * click curving across it in colour.
 */

/** A row's tint, by what kind of thing it is. */
const ROW_STYLE: Record<NodeKind, { bg: string; text: string }> = {
  screen: { bg: "var(--c-green-bg)", text: "var(--c-green)" },
  door: { bg: "var(--c-purple-bg)", text: "var(--c-purple)" },
  logic: { bg: "var(--c-blue-bg)", text: "var(--c-blue)" },
  data: { bg: "var(--c-yellow-bg)", text: "var(--c-yellow)" },
};

/**
 * Journeys get their own colours so two crossing lines can be told apart —
 * the one thing a black-on-black tangle can never do.
 */
const JOURNEY_COLOURS = ["var(--brand-purple)", "var(--c-pink)", "var(--brand-blue)"];

/** Structure: down from the parent, across, down into the child. */
function branchPath(a: PageCard, b: PageCard) {
  const ax = a.x + CARD_W / 2;
  const ay = a.y + a.h;
  const bx = b.x + CARD_W / 2;
  const by = b.y;
  const mid = ay + (by - ay) / 2;
  return `M${ax} ${ay} V${mid} H${bx} V${by}`;
}

/** A journey: a soft curve from the side of one card to the side of another. */
function journeyPath(a: PageCard, b: PageCard) {
  const rightward = b.x > a.x;
  const ax = rightward ? a.x + CARD_W : a.x;
  const bx = rightward ? b.x : b.x + CARD_W;
  const ay = a.y + 26;
  const by = b.y + 26;
  const reach = Math.max(60, Math.abs(bx - ax) / 2);
  return `M${ax} ${ay} C ${ax + (rightward ? reach : -reach)} ${ay}, ${
    bx - (rightward ? reach : -reach)
  } ${by}, ${bx} ${by}`;
}

export function SitemapCanvas({
  sitemap,
  selectedId,
  onSelect,
  matches,
  detailed,
  onDetailed,
}: {
  sitemap: Sitemap;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  matches: Set<string> | null;
  /** Cards list what's inside them, or collapse to plain structure. */
  detailed: boolean;
  onDetailed: (next: boolean) => void;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [view, setView] = React.useState({ x: 0, y: 0, k: 1 });
  const [ready, setReady] = React.useState(false);
  const [smooth, setSmooth] = React.useState(false);
  const [hovered, setHovered] = React.useState<string | null>(null);

  const byId = React.useMemo(
    () => new Map(sitemap.cards.map((c) => [c.id, c])),
    [sitemap.cards],
  );

  const fit = React.useCallback(() => {
    const host = hostRef.current;
    if (!host || !sitemap.cards.length) return;
    const pad = 56;
    const { width, height } = host.getBoundingClientRect();
    // Never open so far out that the cards can't be read — better to start
    // legible and let people pan than to show a field of grey stamps.
    const scale = Math.max(
      0.6,
      Math.min((width - pad * 2) / sitemap.width, (height - pad * 2) / sitemap.height, 1),
    );
    const fits = sitemap.width * scale <= width - pad * 2;
    setView({
      k: scale,
      x: fits ? width / 2 - (sitemap.width / 2) * scale : pad,
      y: pad,
    });
    setReady(true);
  }, [sitemap]);

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

  const pan = React.useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [grabbing, setGrabbing] = React.useState(false);

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

  /** The card a selected row belongs to, so its page stays lit too. */
  const litCard = React.useMemo(() => {
    if (!selectedId) return null;
    const card = sitemap.cards.find(
      (c) => c.id === selectedId || c.blocks.some((b) => b.id === selectedId),
    );
    return card?.id ?? null;
  }, [selectedId, sitemap.cards]);

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
      onWheel={(e) => {
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
      }}
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
          <defs>
            <marker
              id="journey-head"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M0 1 L7 4 L0 7 z" fill="var(--brand-purple)" />
            </marker>
          </defs>

          {/* Structure first, underneath everything. */}
          {sitemap.branches.map((b) => {
            const from = byId.get(b.from);
            const to = byId.get(b.to);
            if (!from || !to) return null;
            return (
              <path
                key={`b:${b.from}->${b.to}`}
                d={branchPath(from, to)}
                fill="none"
                stroke="var(--text-ghost)"
                strokeWidth={1.25}
                strokeLinejoin="round"
              />
            );
          })}

          {/* The links people can click, curving across the structure. */}
          {sitemap.journeys.map((j, i) => {
            const from = byId.get(j.from);
            const to = byId.get(j.to);
            if (!from || !to) return null;
            const mine =
              hovered === j.from || hovered === j.to || litCard === j.from || litCard === j.to;
            const colour = JOURNEY_COLOURS[i % JOURNEY_COLOURS.length];
            return (
              <path
                key={`j:${j.from}->${j.to}`}
                d={journeyPath(from, to)}
                fill="none"
                stroke={colour}
                strokeWidth={mine ? 2 : 1.25}
                markerEnd={mine ? "url(#journey-head)" : undefined}
                // Quiet until you're on one of its two ends.
                opacity={hovered || litCard ? (mine ? 1 : 0.12) : 0.42}
                style={{ transition: "opacity 100ms ease-out" }}
              />
            );
          })}
        </svg>

        {sitemap.cards.map((card) => {
          const selected = selectedId === card.id;
          const hit = matches?.has(card.id) ?? false;
          const dim =
            matches && !hit && !card.blocks.some((b) => matches.has(b.id));

          return (
            <div
              key={card.id}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setHovered(card.id)}
              onMouseLeave={() => setHovered((h) => (h === card.id ? null : h))}
              className={cn(
                "absolute overflow-hidden rounded-lg bg-raised transition-[box-shadow,opacity] duration-150",
                selected
                  ? "shadow-[0_0_0_2px_var(--accent),var(--shadow-popover)]"
                  : hit
                    ? "shadow-[0_0_0_2px_var(--brand-amber),var(--shadow-popover)]"
                    : "shadow-card",
                dim && "opacity-30",
              )}
              style={{ left: card.x, top: card.y, width: CARD_W }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(selected ? null : card.id);
                }}
                className="notion-hover block w-full px-3 pt-2.5 pb-2 text-left"
              >
                <span className="block truncate text-[13.5px] font-semibold text-primary">
                  {card.title}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <span className="inline-block rounded-sm bg-[rgb(var(--ink)/0.06)] px-1.5 py-px font-mono text-[10px] text-tertiary">
                    {card.path}
                  </span>
                  {!detailed && card.inside > 0 && (
                    <span className="text-[10px] text-tertiary">
                      {card.inside} {card.inside === 1 ? "thing" : "things"} it does
                    </span>
                  )}
                </span>
              </button>

              {card.blocks.length > 0 && (
                <div className="space-y-px px-2 pb-2">
                  {card.blocks.map((block) => {
                    const style = ROW_STYLE[block.kind];
                    const on = selectedId === block.id;
                    return (
                      <button
                        key={block.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(on ? null : block.id);
                        }}
                        className={cn(
                          "flex h-[21px] w-full items-center rounded-xs px-1.5 text-left",
                          "transition-[box-shadow] duration-[20ms]",
                          on && "shadow-[0_0_0_1.5px_var(--accent)]",
                        )}
                        style={{ background: style.bg }}
                      >
                        <span
                          className="truncate text-[10.5px] font-medium"
                          style={{ color: style.text }}
                        >
                          {block.title}
                        </span>
                      </button>
                    );
                  })}
                  {card.more > 0 && (
                    <div className="px-1.5 pt-0.5 text-[10px] text-tertiary">
                      and {card.more} more
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Structure on its own, or with what each page does inside it. */}
      <div className="absolute top-3 right-3 flex items-center gap-0.5 rounded-lg bg-raised/90 p-0.5 shadow-card backdrop-blur-sm">
        {[
          { on: false, label: "Structure" },
          { on: true, label: "What's inside" },
        ].map((choice) => (
          <button
            key={choice.label}
            onClick={() => onDetailed(choice.on)}
            className={cn(
              "h-7 rounded-sm px-2 text-[12.5px] transition-[background,color] duration-[20ms]",
              detailed === choice.on
                ? "bg-active font-medium text-primary"
                : "text-secondary hover:bg-hover",
            )}
          >
            {choice.label}
          </button>
        ))}
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
          aria-label="Fit the whole map"
          title="Fit the whole map"
        >
          <Maximize2 className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}
