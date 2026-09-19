"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import type { RepoMap } from "@/lib/graph";
import { Canvas } from "@/components/workspace/canvas";
import { Inspector } from "@/components/workspace/inspector";
import { MapSidebar } from "@/components/workspace/map-sidebar";
import { KIND_LEGEND, KIND_COLOR } from "@/components/workspace/kind";
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

/** First-run explainer. Most people here have never seen their code drawn. */
function Primer({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="pointer-events-auto w-[320px] rounded-xl bg-raised p-4 shadow-popover">
      <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-primary">
        What am I looking at?
      </h2>
      <p className="mt-1.5 text-[12.5px] leading-[1.55] text-secondary">
        Every box is one real piece of your app. Lines run left to right, in the
        order a request travels.
      </p>
      <div className="mt-3 space-y-2">
        {KIND_LEGEND.map(({ kind, label, hint }) => (
          <div key={kind} className="flex gap-2.5">
            <span
              className="mt-[5px] h-3 w-[4px] shrink-0 rounded-full"
              style={{ background: KIND_COLOR[kind] }}
            />
            <div>
              <div className="text-[12.5px] font-medium text-primary">
                {label}
              </div>
              <div className="text-[12px] leading-[1.45] text-tertiary">
                {hint}
              </div>
            </div>
          </div>
        ))}
      </div>
      <Button
        variant="secondary"
        size="md"
        className="mt-3.5 w-full"
        onClick={onDismiss}
      >
        Got it
      </Button>
    </div>
  );
}

export function Workspace({ owner, repo }: { owner: string; repo: string }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [primer, setPrimer] = React.useState(false);
  const [nonce, setNonce] = React.useState(0);
  const [result, setResult] = React.useState<Result | null>(null);

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
        try {
          if (!localStorage.getItem("codarc-primer-seen")) setPrimer(true);
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
  }, [owner, repo, key]);

  const state: Result | { phase: "loading" } =
    result?.key === key ? result : { phase: "loading" };

  function dismissPrimer() {
    setPrimer(false);
    try {
      localStorage.setItem("codarc-primer-seen", "1");
    } catch {}
  }

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
  const selected = map.nodes.find((n) => n.id === selectedId) ?? null;

  return (
    <div className="flex h-dvh overflow-hidden">
      <MapSidebar map={map} selectedId={selectedId} onSelect={setSelectedId} />

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
            map={map}
            selectedId={selectedId}
            onSelect={setSelectedId}
            storageKey={`codarc-layout:${owner}/${repo}`}
          />
        )}

        <div className="pointer-events-none absolute top-3 right-3 bottom-3 flex flex-col items-end gap-3">
          {primer && <Primer onDismiss={dismissPrimer} />}
          {selected && (
            <Inspector
              key={selected.id}
              node={selected}
              map={map}
              onClose={() => setSelectedId(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
