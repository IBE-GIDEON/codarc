"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/* Nodes live in world coordinates and the whole world is scaled to fit —
   the same mechanism the real pannable canvas will use, so positions never
   need to be responsive themselves. */
const WORLD_W = 708;
const WORLD_H = 340;

/* Where the brand lives.
   The chrome is Notion; the canvas is Codarc. A node is a Notion-shaped card
   (6px radius, hairline, card shadow) with a brand *pill* as its type marker —
   which is how the logo's three bars get into the product without turning the
   whole UI into pills and gradients. */

const types = {
  route: { color: "var(--brand-purple)", label: "route" },
  service: { color: "var(--brand-blue)", label: "service" },
  data: { color: "var(--brand-amber)", label: "data" },
} as const;

export function Node({
  type,
  name,
  meta,
  selected,
  className,
  style,
}: {
  type: keyof typeof types;
  name: string;
  meta: string;
  selected?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const t = types[type];
  return (
    <div
      className={cn(
        "group flex w-[186px] cursor-pointer items-center gap-2.5 rounded-lg bg-raised px-2.5 py-2",
        "shadow-card transition-shadow duration-150",
        "hover:shadow-popover",
        selected && "shadow-[0_0_0_2px_var(--accent),var(--shadow-popover)]",
        className,
      )}
      style={style}
    >
      <span
        className="h-7 w-[7px] shrink-0 rounded-full"
        style={{ background: t.color }}
      />
      <span className="min-w-0">
        <span className="block truncate font-mono text-[12.5px] text-primary">
          {name}
        </span>
        <span className="block truncate text-[11px] text-tertiary">{meta}</span>
      </span>
    </div>
  );
}

export function Legend() {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-raised/90 px-2.5 py-1.5 shadow-card backdrop-blur-sm">
      {(Object.keys(types) as (keyof typeof types)[]).map((k) => (
        <span key={k} className="flex items-center gap-1.5 text-[11px] text-secondary">
          <span
            className="h-2.5 w-[7px] rounded-full"
            style={{ background: types[k].color }}
          />
          {types[k].label}
        </span>
      ))}
    </div>
  );
}

export function CanvasPreview() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) =>
      setScale(Math.min(1, entry.contentRect.width / WORLD_W)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="canvas-grid relative overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_var(--border)]"
      style={{ height: WORLD_H * scale }}
    >
      <div
        className="absolute top-0 left-0 origin-top-left"
        style={{ width: WORLD_W, height: WORLD_H, transform: `scale(${scale})` }}
      >
      {/* dotted connectors, same language as the backdrop art */}
      <svg className="absolute inset-0 size-full" aria-hidden>
        <g
          stroke="var(--text-ghost)"
          strokeWidth="1.5"
          strokeDasharray="1 5"
          strokeLinecap="round"
          fill="none"
        >
          <path d="M206 76 C 233 76, 233 152, 261 152" />
          <path d="M206 152 H 261" />
          <path d="M206 228 C 233 228, 233 152, 261 152" />
          <path d="M447 152 C 474 152, 474 98, 502 98" />
          <path d="M447 152 C 474 152, 474 226, 502 226" />
        </g>
      </svg>

      <Node type="route" name="POST /auth/login" meta="routes/auth.py" style={{ position: "absolute", left: 20, top: 54 }} />
      <Node type="route" name="GET /me" meta="routes/auth.py" style={{ position: "absolute", left: 20, top: 130 }} />
      <Node type="route" name="POST /billing/hook" meta="routes/billing.py" style={{ position: "absolute", left: 20, top: 206 }} />

      <Node type="service" name="AuthService" meta="services/auth.py · 4 refs" selected style={{ position: "absolute", left: 261, top: 130 }} />

      <Node type="data" name="User" meta="models/user.py" style={{ position: "absolute", left: 502, top: 76 }} />
      <Node type="data" name="Session" meta="models/session.py" style={{ position: "absolute", left: 502, top: 204 }} />

        <div className="absolute bottom-3 left-3">
          <Legend />
        </div>
      </div>
    </div>
  );
}
