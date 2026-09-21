"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { RepoMap } from "@/lib/graph";
import { Canvas, type CanvasHandle } from "@/components/workspace/canvas";
import { matchNodes } from "@/components/workspace/search";
import { Tour, type TourStep } from "@/components/workspace/tour";
import { Inspector } from "@/components/workspace/inspector";
import { MapSidebar } from "@/components/workspace/map-sidebar";
import { ShareDialog } from "@/components/workspace/share-dialog";
import { PresenceStack, useLiveCursors } from "@/components/workspace/live-cursors";
import type { Offsets } from "@/lib/share";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

type Result =
  | { key: string; phase: "error"; error: string; hint: string }
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
  onRetry,
}: {
  error: string;
  hint: string;
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
          <Button variant="primary" size="lg" onClick={onRetry}>
            <RefreshCw className="size-3.5" /> Try again
          </Button>
          <Link href="/">
            <Button variant="secondary" size="lg">
              <ArrowLeft className="size-3.5" /> Start over
            </Button>
          </Link>
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
  const [sharing, setSharing] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");
  const canvasRef = React.useRef<CanvasHandle>(null);
  const [tour, setTour] = React.useState(false);
  // Bumped on every replay so <Tour> remounts and starts from step one.
  const [tourRun, setTourRun] = React.useState(0);
  const [nonce, setNonce] = React.useState(0);
  const [result, setResult] = React.useState<Result | null>(null);
  // Studio only — the server decides, and a shared-link viewer never asks.
  const live = useLiveCursors(owner, repo, !readOnly);

  // The request this render is waiting on. Anything stale is ignored, so a
  // fast retry can't land after a slow first attempt.
  const key = `${owner}/${repo}#${nonce}`;

  React.useEffect(() => {
    let cancelled = false;

    fetch(`/api/map?repo=${encodeURIComponent(`${owner}/${repo}`)}`)
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setResult({
            key,
            phase: "error",
            error: body.error ?? "That didn't work",
            hint: body.hint ?? "Try again in a moment.",
          });
          return;
        }
        setResult({ key, phase: "ready", map: body as RepoMap });
        if (sharedFocus) setSelectedId(sharedFocus);
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
        });
      });

    return () => {
      cancelled = true;
    };
  }, [owner, repo, key, sharedFocus, readOnly]);

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
          onRetry={() => setNonce((n) => n + 1)}
        />
      </div>
    );
  }

  const { map } = state;
  const layoutKey = `codarc-layout:${owner}/${repo}`;
  const selected = map.nodes.find((n) => n.id === selectedId) ?? null;
  const matches = matchNodes(map.nodes, query);

  function pick(id: string) {
    setSelectedId(id);
    canvasRef.current?.focusNode(id);
  }

  // Something worth pointing at during the tour: prefer a door, since that's
  // the kind people recognise fastest.
  const demoNode =
    map.nodes.find((n) => n.kind === "door") ?? map.nodes[0] ?? null;

  const steps: TourStep[] = [
    {
      id: "welcome",
      placement: "center",
      title: "This is your app, drawn out",
      body: "Every box below is a real piece of the app you built. Give me a minute and I'll show you what you're looking at and what you can do with it.",
      before: () => {
        setQuery("");
        setSelectedId(null);
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
      target: "node",
      placement: "right",
      title: "Click a box to open it",
      body: "Clicking any box selects it and lights up everything it's connected to, so you can see what depends on what.",
      before: () => {
        if (demoNode) pick(demoNode.id);
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

  function endTour() {
    setTour(false);
    setSelectedId(null);
    try {
      localStorage.setItem("codarc-tour-done", "1");
    } catch {}
  }

  return (
    <div className="flex h-dvh overflow-hidden">
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

      <main className="relative min-w-0 flex-1">
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
        ) : (
          <Canvas
            key={`${owner}/${repo}`}
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
            <PresenceStack people={live.people} colours={live.colours} meId={live.me?.id} />
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
            onClose={() => setSharing(false)}
          />
        )}
      </main>
    </div>
  );
}
