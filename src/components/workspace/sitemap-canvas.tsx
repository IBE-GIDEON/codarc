"use client";

import * as React from "react";
import { ChevronRight, Maximize2, Minus, Plus, Undo2 } from "lucide-react";
import type { NodeKind } from "@/lib/graph";
import { CARD_W, type Card, type Level, type Sitemap } from "@/lib/sitemap";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * One drawing, used at every depth: a card per thing, the structure in
 * straight elbows beneath, and the links someone can click curving across it
 * in colour.
 *
 * A card with somewhere to go opens it. A card at the bottom of the tree, and
 * every coloured row, opens the piece itself in the panel on the right.
 */

/** How far somebody has dragged a card from where we put it. */
type Offset = { dx: number; dy: number };

/** Their arrangement from last time, if they made one. */
function savedOffsets(key: string): Record<string, Offset> {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as Record<string, Offset>) : {};
  } catch {
    return {};
  }
}

/** A row's tint, by what kind of thing it is. */
const ROW_STYLE: Record<NodeKind, { bg: string; text: string }> = {
  screen: { bg: "var(--c-green-bg)", text: "var(--c-green)" },
  door: { bg: "var(--c-purple-bg)", text: "var(--c-purple)" },
  logic: { bg: "var(--c-blue-bg)", text: "var(--c-blue)" },
  data: { bg: "var(--c-yellow-bg)", text: "var(--c-yellow)" },
};

/**
 * A journey is drawn in one quiet colour, dashed, and only for the card you
 * clicked. Three bright colours arcing over the cards read as a wiring
 * diagram laid on top of the map, and the map is the point.
 */
const JOURNEY_COLOUR = "var(--accent)";

/**
 * A colour per part of the app. Grey cards on a grey canvas all weigh the
 * same, and an eye with nowhere to land reads nothing.
 */
const BRANCH_COLOURS = [
  "var(--c-green)",
  "var(--brand-purple)",
  "var(--brand-blue)",
  "var(--c-pink)",
  "var(--brand-amber)",
  "var(--c-teal, var(--c-green))",
  "var(--c-orange)",
];

/** The stripe across the top: which part this is, or what kind of thing. */
function stripeOf(card: Card): string {
  if (card.kind && card.kind !== "screen") return ROW_STYLE[card.kind].text;
  return BRANCH_COLOURS[card.branch % BRANCH_COLOURS.length];
}

/**
 * Structure: down from the parent, across, down into the child — with the
 * corners rounded off, which is the difference between a diagram that looks
 * drawn and one that looks printed by a machine.
 */
function branchPath(a: Card, b: Card) {
  const ax = a.x + CARD_W / 2;
  const ay = a.y + a.h;
  const bx = b.x + CARD_W / 2;
  const by = b.y;
  const mid = ay + (by - ay) / 2;

  if (Math.abs(bx - ax) < 2) return `M${ax} ${ay} V${by}`;

  const dir = bx > ax ? 1 : -1;
  const r = Math.min(12, Math.abs(bx - ax) / 2, (mid - ay) / 2, (by - mid) / 2);
  return [
    `M${ax} ${ay}`,
    `V${mid - r}`,
    `Q ${ax} ${mid} ${ax + dir * r} ${mid}`,
    `H ${bx - dir * r}`,
    `Q ${bx} ${mid} ${bx} ${mid + r}`,
    `V ${by}`,
  ].join(" ");
}

/** A journey: a soft curve from the side of one card to the side of another. */
function journeyPath(a: Card, b: Card) {
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
  onOpen,
  matches,
  detailed,
  onDetailed,
  storageKey,
}: {
  sitemap: Sitemap;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Step into a part, or into a page. */
  onOpen: (level: Level) => void;
  matches: Set<string> | null;
  /** Cards list what's inside them, or collapse to plain structure. */
  detailed: boolean;
  onDetailed: (next: boolean) => void;
  /** Where this depth's own arrangement is kept. */
  storageKey: string;
}) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [view, setView] = React.useState({ x: 0, y: 0, k: 1 });
  const [ready, setReady] = React.useState(false);
  const [smooth, setSmooth] = React.useState(false);

  /*
   * Where somebody has dragged each card. What we work out is a starting
   * point, not an opinion — people picture their own app in their own
   * shape, and once they've arranged it that way it's theirs to keep.
   */
  const [offsets, setOffsets] = React.useState<Record<string, Offset>>(() =>
    savedOffsets(storageKey),
  );

  // Written once the hand stops moving rather than on every frame of a
  // drag, which would be sixty writes a second to save one nudge.
  const loaded = React.useRef(false);
  React.useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      return;
    }
    const save = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(offsets));
      } catch {}
    }, 250);
    return () => clearTimeout(save);
  }, [offsets, storageKey]);

  /** The cards where they actually sit, nudges included. */
  const cards = React.useMemo(
    () =>
      sitemap.cards.map((c) => {
        const moved = offsets[c.id];
        return moved ? { ...c, x: c.x + moved.dx, y: c.y + moved.dy } : c;
      }),
    [sitemap.cards, offsets],
  );

  const byId = React.useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  /** How much room it all takes up now, which dragging changes. */
  const bounds = React.useMemo(
    () => ({
      width: Math.max(1, ...cards.map((c) => c.x + CARD_W)),
      height: Math.max(1, ...cards.map((c) => c.y + c.h)),
    }),
    [cards],
  );

  const fit = React.useCallback(() => {
    const host = hostRef.current;
    if (!host || !cards.length) return;
    const pad = 56;
    const { width, height } = host.getBoundingClientRect();
    /*
     * Open big and squared to the screen. A map that arrives at 40% is a
     * field of grey stamps — better to fill the window and let anyone who
     * wants the whole thing zoom out themselves.
     *
     * The floor gives way to the width, though: a map opens as large as it
     * can while every card is still on the screen, because a card cut off
     * at the edge is a card nobody knows is there. Running off the bottom
     * is fine — everybody scrolls down.
     */
    const across = (width - pad * 2) / bounds.width;
    const down = (height - pad * 2) / bounds.height;
    const floor = Math.min(0.85, Math.max(0.45, across));
    const scale = Math.max(floor, Math.min(across, down, 1.15));
    const fitsWide = bounds.width * scale <= width - pad * 2;
    const fitsTall = bounds.height * scale <= height - pad * 2;
    // When it's wider than the window, open on the top of the tree rather
    // than the left edge — otherwise the first card you'd look for is the
    // one off screen.
    const top = cards.reduce(
      (best, c) => (!best || c.y < best.y ? c : best),
      null as Card | null,
    );
    const anchor = top ? top.x + CARD_W / 2 : bounds.width / 2;

    setView({
      k: scale,
      x: fitsWide ? width / 2 - (bounds.width / 2) * scale : width / 2 - anchor * scale,
      y: fitsTall ? Math.max(pad, height / 2 - (bounds.height / 2) * scale) : pad,
    });
    setReady(true);
  }, [cards, bounds]);

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

  // Stepping in or out, or collapsing the cards, re-frames what's on screen.
  const shape = `${sitemap.title}:${sitemap.cards.length}:${detailed}`;
  const lastShape = React.useRef(shape);
  React.useEffect(() => {
    if (lastShape.current === shape) return;
    lastShape.current = shape;
    if (fitted.current) fit();
  }, [shape, fit]);

  /*
   * The map moves; the page doesn't.
   *
   * React attaches wheel handlers passively, so a handler written the usual
   * way can't stop the browser doing its own thing — and ctrl-scroll or a
   * trackpad pinch then zooms the whole website at the same time as the map,
   * which pulls the layout apart. This one is attached by hand so it can say
   * no first.
   */
  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = host.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        setView((v) => {
          // A trackpad sends small deltas and a mouse wheel sends 120 at
          // once; stepping by a curve keeps one notch from catapulting the
          // map from readable to unreadable.
          const k = Math.min(2.5, Math.max(0.2, v.k * Math.exp(-e.deltaY * 0.002)));
          return { k, x: px - ((px - v.x) / v.k) * k, y: py - ((py - v.y) / v.k) * k };
        });
      } else {
        setView((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
      }
    };

    host.addEventListener("wheel", onWheel, { passive: false });
    return () => host.removeEventListener("wheel", onWheel);
  }, []);

  const pan = React.useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const drag = React.useRef<{
    id: string;
    x: number;
    y: number;
    dx: number;
    dy: number;
    moved: boolean;
  } | null>(null);
  /** True for exactly one click: the one that ends a drag. */
  const dragged = React.useRef(false);
  const [grabbing, setGrabbing] = React.useState(false);

  /*
   * A drag is followed on the window, not on the card.
   *
   * A pointer that leaves the card has to keep moving it, and capturing the
   * pointer instead would send the click that follows to the card rather
   * than to the button inside it — so a plain click would stop opening
   * anything, which is the thing people do most.
   */
  React.useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const mx = e.clientX - d.x;
      const my = e.clientY - d.y;
      // A few pixels of wobble is somebody clicking, not moving.
      if (!d.moved && Math.abs(mx) < 4 && Math.abs(my) < 4) return;
      d.moved = true;
      setOffsets((prev) => ({
        ...prev,
        [d.id]: { dx: d.dx + mx / view.k, dy: d.dy + my / view.k },
      }));
    };
    const up = () => {
      const d = drag.current;
      drag.current = null;
      // The click that ends a drag must not also open the card.
      if (d?.moved) dragged.current = true;
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [view.k]);
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
              <path d="M0 1 L7 4 L0 7 z" fill={JOURNEY_COLOUR} />
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

          {/* Where a page can take you, drawn only for the card you chose. */}
          {sitemap.journeys.map((j) => {
            const from = byId.get(j.from);
            const to = byId.get(j.to);
            if (!from || !to) return null;
            // Only on a click, never on the way past: lines appearing and
            // vanishing under a moving mouse is the most distracting thing
            // a quiet map can do.
            if (litCard !== j.from && litCard !== j.to) return null;
            return (
              <path
                key={`j:${j.from}->${j.to}`}
                d={journeyPath(from, to)}
                fill="none"
                stroke={JOURNEY_COLOUR}
                strokeWidth={1.5}
                strokeDasharray="5 4"
                strokeOpacity={0.7}
                markerEnd="url(#journey-head)"
              />
            );
          })}
        </svg>

        {cards.map((card) => {
          const selected = selectedId === card.id;
          const hit = matches?.has(card.id) ?? false;
          const dim = matches && !hit && !card.blocks.some((b) => matches.has(b.id));
          const stripe = stripeOf(card);

          return (
            <div
              key={card.id}
              onPointerDown={(e) => {
                // The canvas must not pan while a card is being moved.
                e.stopPropagation();
                if (e.button !== 0) return;
                const from = offsets[card.id] ?? { dx: 0, dy: 0 };
                drag.current = {
                  id: card.id,
                  x: e.clientX,
                  y: e.clientY,
                  dx: from.dx,
                  dy: from.dy,
                  moved: false,
                };
              }}
              className={cn(
                "reveal-parent absolute overflow-hidden rounded-lg bg-raised select-none transition-[box-shadow,opacity] duration-150",
                selected
                  ? "shadow-[0_0_0_2px_var(--accent),var(--shadow-popover)]"
                  : hit
                    ? "shadow-[0_0_0_2px_var(--brand-amber),var(--shadow-popover)]"
                    : // A hairline so a card reads as a card, the way a drawn
                      // site map outlines every page.
                      "shadow-[0_0_0_1px_var(--border-strong),var(--shadow-card)]",
                dim && "opacity-30",
              )}
              style={{ left: card.x, top: card.y, width: CARD_W, cursor: "grab" }}
            >
              <span className="block h-[3px] w-full" style={{ background: stripe }} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragged.current) {
                    dragged.current = false;
                    return;
                  }
                  if (card.into) onOpen(card.into);
                  else onSelect(selected ? null : card.id);
                }}
                className="notion-hover block w-full px-3 pt-2.5 pb-2 text-left"
                title={card.into ? `Open ${card.title}` : undefined}
              >
                <span className="flex items-center gap-1">
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-primary">
                    {card.title}
                  </span>
                  {/* Somewhere to go, said quietly until you approach. */}
                  {card.into && (
                    <ChevronRight className="reveal size-3.5 shrink-0 text-tertiary" />
                  )}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  {card.path && (
                    <span className="inline-block max-w-full truncate rounded-sm bg-[rgb(var(--ink)/0.06)] px-1.5 py-px font-mono text-[10px] text-tertiary">
                      {card.path}
                    </span>
                  )}
                  {!detailed && !card.note && card.inside > 0 && (
                    <span className="text-[10px] text-tertiary">
                      {card.inside} {card.inside === 1 ? "thing" : "things"} it does
                    </span>
                  )}
                </span>
                {card.note && (
                  <span className="mt-1 block truncate text-[11px] text-tertiary">
                    {card.note}
                  </span>
                )}
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
                          if (dragged.current) {
                            dragged.current = false;
                            return;
                          }
                          if (block.into) onOpen(block.into);
                          else onSelect(on ? null : block.id);
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

      {/* Structure on its own, or with what's inside each card. */}
      {sitemap.collapsible && (
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
      )}

      <div className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-lg bg-raised/90 p-0.5 shadow-card backdrop-blur-sm">
        {/* Nobody should be able to wreck their own map with no way back. */}
        {Object.keys(offsets).length > 0 && (
          <IconButton
            size="sm"
            onClick={() => setOffsets({})}
            aria-label="Put the cards back where they were"
            title="Put the cards back where they were"
          >
            <Undo2 className="size-3.5" />
          </IconButton>
        )}
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
