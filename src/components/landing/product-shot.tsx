"use client";

import * as React from "react";
import { ChevronRight, Folder, GitPullRequest, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

/* The hero shot. Built in world coordinates and scaled to fit, so it stays
   pixel-exact at any width instead of reflowing into mush. */
const W = 1180;
const H = 520;

const hues = {
  route: "var(--brand-purple)",
  service: "var(--brand-blue)",
  data: "var(--brand-amber)",
} as const;

function Node({
  x,
  y,
  hue,
  name,
  meta,
  selected,
}: {
  x: number;
  y: number;
  hue: keyof typeof hues;
  name: string;
  meta: string;
  selected?: boolean;
}) {
  return (
    <div
      className={cn(
        "absolute flex w-[168px] items-center gap-2.5 rounded-lg bg-raised px-2.5 py-2",
        selected
          ? "shadow-[0_0_0_2px_var(--accent),var(--shadow-popover)]"
          : "shadow-card",
      )}
      style={{ left: x, top: y }}
    >
      <span
        className="h-[26px] w-[6px] shrink-0 rounded-full"
        style={{ background: hues[hue] }}
      />
      <span className="min-w-0">
        <span className="block truncate font-mono text-[11.5px] text-primary">
          {name}
        </span>
        <span className="block truncate text-[10px] text-tertiary">{meta}</span>
      </span>
    </div>
  );
}

function SidebarRow({
  label,
  depth = 0,
  icon,
  active,
}: {
  label: string;
  depth?: number;
  icon?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex h-[25px] items-center gap-1.5 rounded-sm text-[12px]",
        active ? "bg-active font-medium text-primary" : "text-secondary",
      )}
      style={{ paddingLeft: 8 + depth * 14, paddingRight: 6 }}
    >
      <span className="shrink-0 text-tertiary">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}

export function ProductShot() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / W));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="relative w-full" style={{ height: H * scale }}>
      <div
        className="absolute top-0 left-0 flex origin-top-left overflow-hidden"
        style={{ width: W, height: H, transform: `scale(${scale})` }}
      >
        {/* ---- sidebar ---- */}
        <aside className="flex w-[200px] shrink-0 flex-col bg-sidebar px-1.5 pt-2.5">
          <div className="mb-2 flex items-center gap-1.5 px-1.5">
            <Folder className="size-3.5 text-tertiary" />
            <span className="truncate text-[12.5px] font-medium text-primary">
              trendstack-api
            </span>
          </div>
          <SidebarRow label="Search" icon={<Search className="size-3.5" />} />
          <SidebarRow label="Ask Codarc" icon={<Sparkles className="size-3.5" />} />
          <div className="mt-3 mb-1 px-2 text-[10.5px] font-medium text-tertiary">
            Architecture
          </div>
          <SidebarRow label="routes" icon={<ChevronRight className="size-3.5 rotate-90" />} active />
          <SidebarRow label="auth.py" depth={1} />
          <SidebarRow label="billing.py" depth={1} />
          <SidebarRow label="services" icon={<ChevronRight className="size-3.5 rotate-90" />} />
          <SidebarRow label="auth.py" depth={1} />
          <SidebarRow label="billing.py" depth={1} />
          <SidebarRow label="models" icon={<ChevronRight className="size-3.5" />} />
        </aside>

        {/* ---- canvas ---- */}
        <div className="canvas-grid relative flex-1">
          <svg className="absolute inset-0 size-full" aria-hidden>
            <g
              stroke="var(--text-ghost)"
              strokeWidth="1.5"
              strokeDasharray="1 5"
              strokeLinecap="round"
              fill="none"
            >
              <path d="M198 161 C 214 161, 214 197, 230 197" />
              <path d="M198 233 C 214 233, 214 197, 230 197" />
              <path d="M198 305 H 230" />
              <path d="M398 197 C 414 197, 414 161, 430 161" />
              <path d="M398 197 C 414 197, 414 269, 430 269" />
              <path d="M398 305 C 414 305, 414 269, 430 269" />
            </g>
          </svg>

          {/* routes */}
          <Node x={30} y={140} hue="route" name="POST /auth/login" meta="routes/auth.py" />
          <Node x={30} y={212} hue="route" name="GET /auth/me" meta="routes/auth.py" />
          <Node x={30} y={284} hue="route" name="POST /billing/hook" meta="routes/billing.py" />

          {/* services */}
          <Node x={230} y={176} hue="service" name="AuthService" meta="services/auth.py · 3 refs" selected />
          <Node x={230} y={284} hue="service" name="BillingService" meta="services/billing.py" />

          {/* data */}
          <Node x={430} y={140} hue="data" name="User" meta="models/user.py" />
          <Node x={430} y={248} hue="data" name="Session" meta="models/session.py" />

          {/* ---- the inspector: the whole product in one panel ---- */}
          <div className="absolute top-[88px] left-[630px] w-[320px] overflow-hidden rounded-xl bg-raised shadow-modal">
            <div className="flex items-center gap-2 px-3.5 pt-3">
              <span
                className="h-[18px] w-[5px] rounded-full"
                style={{ background: hues.service }}
              />
              <span className="min-w-0">
                <span className="block truncate font-mono text-[12px] text-primary">
                  AuthService
                </span>
                <span className="block truncate text-[10px] text-tertiary">
                  services/auth.py · 3 routes depend on this
                </span>
              </span>
            </div>

            <div className="px-3.5 pt-3">
              <div className="rounded-md bg-sunken p-2.5 shadow-[inset_0_0_0_1px_var(--border)]">
                <p className="text-[12px] leading-[1.45] text-primary">
                  Rate limit login to 5 attempts per minute per IP
                  <span className="ml-px inline-block h-[13px] w-px translate-y-[2px] bg-accent" />
                </p>
              </div>
            </div>

            <div className="px-3.5 pt-3">
              <div className="mb-1.5 text-[10.5px] font-medium text-tertiary">
                Proposed change
              </div>
              <pre className="overflow-hidden rounded-md bg-code p-2.5 font-mono text-[10.5px] leading-[1.6]">
                <div className="text-c-green">
                  + from slowapi import Limiter
                </div>
                <div className="text-c-green">+ limiter = Limiter(remote_addr)</div>
                <div className="text-tertiary">{"  "}@router.post(&quot;/login&quot;)</div>
                <div className="text-c-green">
                  + @limiter.limit(&quot;5/minute&quot;)
                </div>
                <div className="text-tertiary">
                  {"  "}async def login(req: Request):
                </div>
              </pre>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-3">
              <span className="inline-flex h-7 items-center gap-1.5 rounded-sm bg-accent px-2.5 text-[12px] font-medium text-white">
                <GitPullRequest className="size-3.5" />
                Open pull request
              </span>
              <span className="text-[11px] text-tertiary">2 files</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
