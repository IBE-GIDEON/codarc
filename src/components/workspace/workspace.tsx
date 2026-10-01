"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, PanelLeft, RefreshCw } from "lucide-react";
import type { RepoMap } from "@/lib/graph";
import { Canvas, type CanvasHandle } from "@/components/workspace/canvas";
import { matchNodes } from "@/components/workspace/search";
import { Tour, type TourStep } from "@/components/workspace/tour";
import { Inspector } from "@/components/workspace/inspector";
import { MapSidebar } from "@/components/workspace/map-sidebar";
import { ShareDialog } from "@/components/workspace/share-dialog";
import { PresenceStack, useLiveCursors } from "@/components/workspace/live-cursors";
import type { Offsets } from "@/lib/share";
import { rememberMap } from "@/lib/recent";
import { setSidebarOpen, useSidebarOpen } from "@/components/workspace/sidebar-state";
import { SitemapCanvas } from "@/components/workspace/sitemap-canvas";
import {
  APP_LEVEL,
  areasOf,
  buildLevel,
  hasParts,
  partOf,
  type Level,
} from "@/lib/sitemap";
import { Logo } from "@/components/logo";
import { GithubMark } from "@/components/brand-marks";
import { Button, IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** The way past a wall, when the server put one up. */
type Gate = { plans: string; signIn: string | null };

type Result =
  | { key: string; phase: "error"; error: string; hint: string; gate: Gate | null }
  | { key: string; phase: "ready"; map: RepoMap };

const STAGES = [
  "Asking GitHub for the file list",
  "Opening the files that matter",
  "Working out what talks to what",
  "Drawing your map",
];

function Loading({ owner, repo }: { owner: string; repo: string }) {
  const [stage, setStage] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      2600,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="canvas-grid grid size-full place-items-center">
      <div className="w-[min(420px,88vw)] rounded-xl bg-raised p-6 shadow-popover">
        <Logo className="size-7 text-primary" />
        <h1 className="mt-4 text-[18px] font-semibold tracking-[-0.015em] text-primary">
          Reading {owner}/{repo}
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-[1.5] text-secondary">
          This usually takes a few seconds. Big repositories can take up to a
          minute.
        </p>

        <div className="mt-5 space-y-2">
          {STAGES.map((label, i) => (
            <div key={label} className="flex items-center gap-2.5">
              <span
                className="size-1.5 shrink-0 rounded-full transition-colors duration-300"
                style={{
                  background:
                    i < stage
                      ? "var(--c-green)"
                      : i === stage
                        ? "var(--accent)"
                        : "var(--text-ghost)",
                }}
              />
              <span
                className="text-[13px] transition-colors duration-300"
                style={{
                  color: i <= stage ? "var(--text-secondary)" : "var(--text-ghost)",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Failure({
  error,
  hint,
  gate,
  onRetry,
}: {
  error: string;
  hint: string;
  /** Present when the answer is a plan, not another attempt. */
  gate: Gate | null;
  onRetry: () => void;
}) {
  return (
    <div className="canvas-grid grid size-full place-items-center">
      <div className="w-[min(440px,88vw)] rounded-xl bg-raised p-6 shadow-popover">
        <Logo className="size-7 text-primary" />
        <h1 className="mt-4 text-[18px] font-semibold tracking-[-0.015em] text-primary">
          {error}
        </h1>
        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-secondary">
          {hint}
        </p>
        <div className="mt-5 flex gap-2">
          {gate ? (
            <>
              <Link href={gate.plans}>
                <Button variant="primary" size="lg">
                  See the plans
                </Button>
              </Link>
              {gate.signIn ? (
                <a href={gate.signIn}>
                  <Button variant="secondary" size="lg">
                    <GithubMark className="size-3.5" /> Sign in
                  </Button>
                </a>
              ) : (
                <Link href="/dashboard">
                  <Button variant="secondary" size="lg">
                    <ArrowLeft className="size-3.5" /> Your projects
                  </Button>
                </Link>
              )}
            </>
          ) : (
            <>
              <Button variant="primary" size="lg" onClick={onRetry}>
                <RefreshCw className="size-3.5" /> Try again
              </Button>
              <Link href="/">
                <Button variant="secondary" size="lg">
                  <ArrowLeft className="size-3.5" /> Start over
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Present when someone opened a link somebody else shared. */
export type SharedContext = {
  sharedBy: { name: string; login: string; avatar: string };
  sharedAt: number;
  note: string | null;
  focus: string | null;
  offsets: Offsets;
  /** Kept apart from the owner's own layout so a viewer's nudges stay theirs. */
  layoutKey: string;
  /** The link itself: proof this map was deliberately shown to them. */
  token: string;
};

function SharedBanner({ shared }: { shared: SharedContext }) {
  const when = new Date(shared.sharedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
  return (
    <div className="pointer-events-auto flex max-w-[560px] items-start gap-3 rounded-xl bg-raised p-3 pr-4 shadow-popover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={shared.sharedBy.avatar}
        alt=""
        width={28}
        height={28}
        className="size-7 shrink-0 rounded-full"
      />
      <div className="min-w-0">
        <p className="text-[12.5px] text-secondary">
          <span className="font-medium text-primary">{shared.sharedBy.name}</span>{" "}
          shared this map with you · {when}
        </p>
        {shared.note && (
          <p className="mt-1 text-[13px] leading-[1.5] text-primary">
            &ldquo;{shared.note}&rdquo;
          </p>
        )}
      </div>
      <Link href="/" className="ml-auto shrink-0 self-center">
        <Button variant="secondary" size="md">
          Map your own app
        </Button>
      </Link>
    </div>
  );
}

/** Where you are, as a line of names you can click back along. */
function trail(map: RepoMap, level: Level): { label: string; level: Level }[] {
  const home = { label: map.repo, level: APP_LEVEL };
  const areas = areasOf(map);

  if (level.at === "area") {
    const area = areas.find((a) => a.key === level.key);
    return [home, { label: area?.title ?? "This part", level }];
  }
  if (level.at === "page") {
    const page = map.nodes.find((n) => n.id === level.id);
    const area = partOf(map, level.id);
    return [
      home,
      ...(area
        ? [{ label: area.title, level: { at: "area", key: area.key } as Level }]
        : []),
      { label: page?.title ?? "This page", level },
    ];
  }
  return [home];
}

export function Workspace({
  owner,
  repo,
  shared,
}: {
  owner: string;
  repo: string;
  shared?: SharedContext;
}) {
  const readOnly = Boolean(shared);
  // Primitives for the effect below — depending on the `shared` object itself
  // would refetch the map whenever a parent re-rendered with an equal copy.
  const sharedFocus = shared?.focus ?? null;
  const shareToken = shared?.token ?? null;
  const [sharing, setSharing] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const canvasRef = React.useRef<CanvasHandle>(null);
  const [tour, setTour] = React.useState(false);
  // Bumped on every replay so <Tour> remounts and starts from step one.
  const [tourRun, setTourRun] = React.useState(0);
  const [nonce, setNonce] = React.useState(0);
  const sidebarOpen = useSidebarOpen();
  const [result, setResult] = React.useState<Result | null>(null);
  // Studio only — the server decides, and a shared-link viewer never asks.
  const live = useLiveCursors(owner, repo, !readOnly);

  // The request this render is waiting on. Anything stale is ignored, so a
  // fast retry can't land after a slow first attempt.
  const key = `${owner}/${repo}#${nonce}`;
  /*
   * Three depths, in the order anyone asks about their own app:
   *   the app    what did I build
   *   a part     what's in this bit of it
   *   a page     what happens when somebody uses it
   * and then the piece itself, in the panel on the right. Dumping the whole
   * codebase onto one canvas answers the last question to someone who hasn't
   * asked the first.
   */
  const [level, setLevel] = React.useState<Level>(APP_LEVEL);
  // Cards list what's inside them, or collapse to plain structure.
  const [detailed, setDetailed] = React.useState(true);

  // ⌘\ (Ctrl+\ on Windows) hides and shows the sidebar, the way it does in
  // Notion. Ignored while someone is typing, so it can't eat a keystroke.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "\\" || !(e.metaKey || e.ctrlKey)) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;
      e.preventDefault();
      setSidebarOpen(!sidebarOpen);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  React.useEffect(() => {
    let cancelled = false;

    const ask = `/api/map?repo=${encodeURIComponent(`${owner}/${repo}`)}`;

    fetch(shareToken ? `${ask}&share=${encodeURIComponent(shareToken)}` : ask)
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setResult({
            key,
            phase: "error",
            error: body.error ?? "That didn't work",
            hint: body.hint ?? "Try again in a moment.",
            gate: body.gate ?? null,
          });
          return;
        }
        setResult({ key, phase: "ready", map: body as RepoMap });
        if (sharedFocus) setSelectedId(sharedFocus);
        // Your own maps show up under "Recently opened" on the dashboard;
        // someone else's shared link doesn't.
        if (!readOnly) {
          const map = body as RepoMap;
          rememberMap({
            owner: map.owner,
            repo: map.repo,
            overview: map.overview.slice(0, 160) || undefined,
            isPrivate: map.isPrivate,
          });
        }
        try {
          if (!readOnly && !localStorage.getItem("codarc-tour-done")) setTour(true);
        } catch {}
      })
      .catch(() => {
        if (cancelled) return;
        setResult({
          key,
          phase: "error",
          error: "We couldn't reach Codarc",
          hint: "Check your connection and try again.",
          gate: null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [owner, repo, key, sharedFocus, shareToken, readOnly]);

  const state: Result | { phase: "loading" } =
    result?.key === key ? result : { phase: "loading" };

  if (state.phase === "loading") {
    return (
      <div className="h-dvh">
        <Loading owner={owner} repo={repo} />
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="h-dvh">
        <Failure
          error={state.error}
          hint={state.hint}
          gate={state.gate}
          onRetry={() => setNonce((n) => n + 1)}
        />
      </div>
    );
  }

  const { map } = state;
  const layoutKey = `codarc-layout:${owner}/${repo}`;
  const selected = map.nodes.find((n) => n.id === selectedId) ?? null;
  const matches = matchNodes(map.nodes, query);
  const sitemap = buildLevel(map, level, detailed);
  const crumbs = trail(map, level);
  // Each depth remembers its own arrangement — moving a card inside one part
  // shouldn't shuffle the view you had of another.
  const cardsKey = `codarc-cards:${owner}/${repo}:${level.at}:${
    level.at === "area" ? level.key : level.at === "page" ? level.id : ""
  }`;

  /** Step into a part, or into a page. The drawing stays; what's on it changes. */
  function open(next: Level) {
    setLevel(next);
    setSelectedId(null);
  }

  function pick(id: string) {
    setSelectedId(id);
    canvasRef.current?.focusNode(id);

    // Bring the picture to wherever that piece lives, so the panel and the
    // map are never telling two different stories.
    const node = map.nodes.find((n) => n.id === id);
    if (!node) return;
    if (node.kind === "screen") {
      setLevel({ at: "page", id });
      return;
    }
    const pages = new Set(
      map.nodes.filter((n) => n.kind === "screen").map((n) => n.id),
    );
    const host = map.edges.find((e) => e.to === id && pages.has(e.from));
    if (host) setLevel({ at: "page", id: host.from });
  }

  // Something worth pointing at during the tour: prefer a door, since that's
  // the kind people recognise fastest.
  const demoNode =
    map.nodes.find((n) => n.kind === "door") ?? map.nodes[0] ?? null;
  // A page with something behind it tells the story better than a bare one.
  const demoPage =
    map.nodes.find(
      (n) => n.kind === "screen" && map.edges.some((e) => e.from === n.id),
    ) ?? map.nodes.find((n) => n.kind === "screen") ?? null;

  const allSteps: TourStep[] = [
    {
      id: "welcome",
      placement: "center",
      title: "This is your app, drawn out",
      body: "Give me a minute and I'll show you what you're looking at and what you can do with it.",
      before: () => {
        setQuery("");
        setSelectedId(null);
        setLevel(APP_LEVEL);
      },
    },
    {
      id: "parts",
      placement: "center",
      title: "What your app is made of",
      body: hasParts(map)
        ? "Every card is one part of the app you built, and the lines inside it are the pages in that part. Nothing deeper is shown until you ask for it."
        : "Every card is one page you built, and the lines inside it are the things that page sets off. Nothing deeper is shown until you ask for it.",
      before: () => {
        setSelectedId(null);
        setLevel(APP_LEVEL);
      },
    },
    {
      id: "inside",
      placement: "center",
      title: "Step inside a part",
      body: "Click a part and you get its pages, drawn the way they sit inside one another. The way back out is always in the top left.",
      before: () => {
        const area = areasOf(map)[0];
        if (area) setLevel({ at: "area", key: area.key });
      },
    },
    {
      id: "page",
      placement: "center",
      title: "Then one page at a time",
      body: "Click a page and you see what happens on it — what it sets off, what it keeps, and where it can take somebody next. This is where you describe a change.",
      before: () => {
        if (demoPage) setLevel({ at: "page", id: demoPage.id });
      },
    },
    {
      id: "colours",
      target: "list",
      placement: "right",
      title: "Four kinds of box",
      body: "Green is a screen someone looks at. Purple is a door where a request arrives. Blue is the logic doing the work. Amber is the information you store.",
    },
    {
      id: "canvas",
      target: "canvas",
      placement: "left",
      title: "Move around freely",
      body: "Drag the background to pan, scroll to move, and hold Ctrl while scrolling to zoom. Drag any box to put it where it makes sense to you — your arrangement is remembered.",
    },
    {
      id: "node",
      placement: "center",
      title: "Click a card to open it",
      body: "A card with nothing under it opens in the panel on the right instead — what it is, the file it lives in, and what leans on it.",
      before: () => {
        if (demoNode) setSelectedId(demoNode.id);
      },
    },
    {
      id: "inspector",
      target: "inspector",
      placement: "left",
      title: "What this piece actually does",
      body: "A plain description first, then the exact file it lives in and the other files it reaches into. Click the file name to read it on GitHub.",
      before: () => {
        if (demoNode) setSelectedId(demoNode.id);
      },
    },
    {
      id: "impact",
      target: "impact",
      placement: "left",
      title: "What breaks if you touch it",
      body: "Before you change anything, Codarc tells you what else leans on this piece and how risky it is. Click any of them to jump straight there.",
      before: () => {
        if (demoNode) setSelectedId(demoNode.id);
      },
    },
    {
      id: "change",
      target: "change",
      placement: "left",
      title: "Say what you want different",
      body: "Describe the change the way you'd explain it to a person. You never have to say which file — Codarc already knows which one this box came from.",
      before: () => {
        if (demoNode) setSelectedId(demoNode.id);
      },
    },
    {
      id: "search",
      target: "search",
      placement: "right",
      title: "Find anything fast",
      body: "Press / or Ctrl-K and type an ordinary word like login, payment or user. Matches get an amber outline on the map and everything else fades back.",
      before: () => {
        setSelectedId(null);
        setQuery("");
      },
    },
    {
      id: "list",
      target: "list",
      placement: "right",
      title: "The same pieces, as a list",
      body: "Click any line and the map flies to it. A count like 16/23 means the map is showing the 16 busiest so it stays readable — nothing is lost, it's all still here.",
    },
    {
      id: "help",
      target: "help",
      placement: "bottom",
      title: "That's the whole thing",
      body: "Press this question mark any time to walk through it again. Go and click something.",
    },
  ];

  // A small app has no parts to step into, so don't promise one.
  const steps = allSteps.filter((s) => s.id !== "inside" || hasParts(map));

  function endTour() {
    setTour(false);
    setSelectedId(null);
    try {
      localStorage.setItem("codarc-tour-done", "1");
    } catch {}
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {sidebarOpen && (
      <MapSidebar
        map={map}
        selectedId={selectedId}
        onSelect={pick}
        query={query}
        onQueryChange={setQuery}
        matches={matches}
        onReplayTour={() => {
          setTourRun((r) => r + 1);
          setTour(true);
        }}
        onShare={() => setSharing(true)}
        readOnly={readOnly}
      />
      )}

      <main className="relative min-w-0 flex-1">
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          {!sidebarOpen && (
            <IconButton
              onClick={() => setSidebarOpen(true)}
              aria-label="Show the sidebar"
              title="Show the sidebar  ⌘\"
              className="bg-raised/90 shadow-card backdrop-blur-sm"
            >
              <PanelLeft className="size-4" />
            </IconButton>
          )}

          {/* Where you are, and the way back out. */}
          {!query && (
            <div className="flex items-center gap-0.5 rounded-lg bg-raised/90 p-1 shadow-card backdrop-blur-sm">
              {sitemap.up && (
                <IconButton
                  size="sm"
                  onClick={() => open(sitemap.up!)}
                  aria-label="Back out one step"
                  title="Back out one step"
                >
                  <ArrowLeft className="size-3.5" />
                </IconButton>
              )}
              {crumbs.map((crumb, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <React.Fragment key={`${crumb.label}:${i}`}>
                    {i > 0 && <span className="px-0.5 text-ghost">/</span>}
                    <button
                      onClick={() => !last && open(crumb.level)}
                      className={cn(
                        "h-7 max-w-[180px] truncate rounded-sm px-1.5 text-[12.5px]",
                        last
                          ? "font-medium text-primary"
                          : "text-secondary hover:bg-hover hover:text-primary",
                      )}
                    >
                      {crumb.label}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* What this depth is for, said once, in the corner. */}
        {!query && !selectedId && (
          <p className="pointer-events-none absolute top-[54px] left-3 z-10 text-[12.5px] text-tertiary">
            {sitemap.hint}
          </p>
        )}
        {map.nodes.length === 0 ? (
          <div className="canvas-grid grid size-full place-items-center p-6">
            <div className="w-[min(420px,88vw)] rounded-xl bg-raised p-6 shadow-popover">
              <h1 className="text-[17px] font-semibold text-primary">
                We read it, but couldn&apos;t find the shape
              </h1>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-secondary">
                Codarc looks for web addresses, shared logic and saved data. This
                repository may be a library, a set of scripts, or written in a
                language we don&apos;t read yet.
              </p>
              <Link href="/">
                <Button variant="secondary" size="lg" className="mt-4">
                  <ArrowLeft className="size-3.5" /> Try another repository
                </Button>
              </Link>
            </div>
          </div>
        ) : !query ? (
          /* One drawing, at whichever depth you're standing on. */
          <SitemapCanvas
            key={cardsKey}
            sitemap={sitemap}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onOpen={open}
            storageKey={cardsKey}
            matches={matches}
            detailed={detailed}
            onDetailed={setDetailed}
          />
        ) : (
          <Canvas
            key={`${owner}/${repo}:search`}
            ref={canvasRef}
            map={map}
            selectedId={selectedId}
            onSelect={setSelectedId}
            storageKey={shared?.layoutKey ?? layoutKey}
            initialOffsets={shared?.offsets}
            matches={matches}
            onWorldPointer={live.onWorldPointer}
            overlay={live.renderCursors}
          />
        )}

        {shared && (
          <div className="pointer-events-none absolute top-3 left-3 z-10">
            <SharedBanner shared={shared} />
          </div>
        )}

        {live.enabled && (
          <div className="pointer-events-none absolute bottom-3 left-3 z-10">
            <PresenceStack
              people={live.people}
              colours={live.colours}
              meId={live.me?.id}
              status={live.status}
            />
          </div>
        )}

        <div className="pointer-events-none absolute top-3 right-3 bottom-3 flex flex-col items-end gap-3">
          {selected && (
            <Inspector
              key={selected.id}
              node={selected}
              map={map}
              onSelect={pick}
              readOnly={readOnly}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>

        <Tour key={tourRun} steps={steps} open={tour} onClose={endTour} />

        {sharing && (
          <ShareDialog
            owner={owner}
            repo={repo}
            layoutKey={layoutKey}
            selected={selected}
            isPrivate={map.isPrivate}
            onClose={() => setSharing(false)}
          />
        )}
      </main>
    </div>
  );
}
