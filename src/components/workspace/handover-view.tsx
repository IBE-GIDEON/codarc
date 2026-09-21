"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, Lock, Printer } from "lucide-react";
import type { RepoMap } from "@/lib/graph";
import { KIND_COPY, type NodeKind } from "@/lib/graph";
import { buildHandover, toMarkdown, type Handover } from "@/lib/handover";
import { KIND_COLOR } from "@/components/workspace/kind";
import { Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";

type State =
  | { at: "loading" }
  | { at: "denied" }
  | { at: "error"; error: string; hint: string }
  | { at: "ready"; doc: Handover };

function Piece({
  piece,
}: {
  piece: Handover["groups"][number]["pieces"][number];
}) {
  return (
    <div className="break-inside-avoid py-5 shadow-[inset_0_1px_0_0_var(--border)]">
      <div className="flex items-baseline gap-2.5">
        <span
          className="mt-1 h-3.5 w-[4px] shrink-0 rounded-full"
          style={{ background: KIND_COLOR[piece.kind] }}
        />
        <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-primary">
          {piece.title}
        </h3>
        <span className="text-[12px] text-tertiary">
          {KIND_COPY[piece.kind].label}
        </span>
      </div>

      <p className="mt-2 ml-[18px] text-[15px] leading-[1.6] text-secondary">
        {piece.summary}
      </p>

      <dl className="mt-3 ml-[18px] space-y-1.5 text-[13px]">
        <div className="flex gap-2">
          <dt className="w-[110px] shrink-0 text-tertiary">Technical name</dt>
          <dd className="font-mono text-secondary">{piece.code}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-[110px] shrink-0 text-tertiary">Lives in</dt>
          <dd className="font-mono text-secondary">
            {piece.file}
            <span className="text-ghost"> · line {piece.line}</span>
          </dd>
        </div>
        {piece.usesNames.length > 0 && (
          <div className="flex gap-2">
            <dt className="w-[110px] shrink-0 text-tertiary">Reaches into</dt>
            <dd className="text-secondary">{piece.usesNames.join(", ")}</dd>
          </div>
        )}
        {piece.usedByNames.length > 0 && (
          <div className="flex gap-2">
            <dt className="w-[110px] shrink-0 text-tertiary">Relied on by</dt>
            <dd className="text-secondary">{piece.usedByNames.join(", ")}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export function HandoverView({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) {
  const [state, setState] = React.useState<State>({ at: "loading" });

  React.useEffect(() => {
    let live = true;

    Promise.all([
      fetch("/api/capabilities").then((r) => r.json()),
      fetch(`/api/map?repo=${encodeURIComponent(`${owner}/${repo}`)}`).then(
        async (r) => ({ ok: r.ok, body: await r.json() }),
      ),
    ])
      .then(([caps, map]) => {
        if (!live) return;
        if (!caps.isStudio) {
          setState({ at: "denied" });
          return;
        }
        if (!map.ok) {
          setState({
            at: "error",
            error: map.body.error ?? "We couldn't read that repository",
            hint: map.body.hint ?? "Try again in a moment.",
          });
          return;
        }
        setState({ at: "ready", doc: buildHandover(map.body as RepoMap) });
      })
      .catch(() => {
        if (live)
          setState({
            at: "error",
            error: "We couldn't reach Codarc",
            hint: "Check your connection and try again.",
          });
      });

    return () => {
      live = false;
    };
  }, [owner, repo]);

  function download(doc: Handover) {
    const blob = new Blob([toMarkdown(doc, window.location.host)], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${doc.repo}-how-it-works.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const back = `/r/${owner}/${repo}`;

  if (state.at === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center bg-page">
        <div className="flex items-center gap-2.5 text-[14px] text-secondary">
          <Loader2 className="size-4 animate-spin text-accent" />
          Putting the pack together…
        </div>
      </div>
    );
  }

  if (state.at === "denied") {
    return (
      <div className="grid min-h-dvh place-items-center bg-page px-6">
        <div className="w-[min(440px,100%)] rounded-xl bg-raised p-6 shadow-popover">
          <Lock className="size-5 text-tertiary" />
          <h1 className="mt-4 text-[20px] font-semibold tracking-[-0.015em] text-primary">
            The handover pack is part of Studio
          </h1>
          <p className="mt-2 text-[14px] leading-[1.6] text-secondary">
            It writes out your whole app in plain English — every piece, what it
            does, and what it connects to. The document you hand to a developer
            you&apos;re hiring, or to whoever comes after you.
          </p>
          <div className="mt-5 flex gap-2">
            <Link href={`/choose?back=${encodeURIComponent(back)}`}>
              <Button variant="primary" size="lg">
                See the plans
              </Button>
            </Link>
            <Link href={back}>
              <Button variant="secondary" size="lg">
                <ArrowLeft className="size-3.5" /> Back to the map
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (state.at === "error") {
    return (
      <div className="grid min-h-dvh place-items-center bg-page px-6">
        <div className="w-[min(440px,100%)] rounded-xl bg-raised p-6 shadow-popover">
          <h1 className="text-[18px] font-semibold text-primary">
            {state.error}
          </h1>
          <p className="mt-2 text-[14px] leading-[1.55] text-secondary">
            {state.hint}
          </p>
          <Link href={back} className="mt-4 inline-block">
            <Button variant="secondary" size="lg">
              <ArrowLeft className="size-3.5" /> Back to the map
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { doc } = state;

  return (
    <div className="min-h-dvh bg-page">
      {/* the bar disappears when printed — the document is the deliverable */}
      <header className="sticky top-0 z-10 flex h-16 items-center gap-3 bg-page/85 px-6 backdrop-blur-sm print:hidden">
        <Link href="/" aria-label="Codarc home">
          <Wordmark size="sm" />
        </Link>
        <Link
          href={back}
          className="notion-hover flex items-center gap-1.5 px-2 py-1 text-[13.5px] text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" /> Back to the map
        </Link>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="lg" onClick={() => download(doc)}>
            <Download className="size-3.5" /> Download
          </Button>
          <Button variant="primary" size="lg" onClick={() => window.print()}>
            <Printer className="size-3.5" /> Save as PDF
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[760px] px-6 pb-24">
        <h1 className="text-[38px] leading-[1.15] font-bold tracking-[-0.03em] text-primary">
          {doc.repo} — how it works
        </h1>
        <p className="mt-2 text-[13px] text-tertiary">
          A plain-English guide to this app · {doc.generatedOn} ·{" "}
          <span className="font-mono">{doc.branch}</span>
        </p>

        <section className="mt-8 rounded-sm bg-sunken p-5">
          <h2 className="text-[13px] font-medium text-tertiary">
            What this app is
          </h2>
          <p className="mt-2 text-[17px] leading-[1.6] text-primary">
            {doc.overview}
          </p>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {doc.counts.map((c) => (
              <span key={c.kind} className="flex items-center gap-1.5">
                <span
                  className="h-3 w-[4px] rounded-full"
                  style={{ background: KIND_COLOR[c.kind as NodeKind] }}
                />
                <span className="text-[13.5px] text-secondary">
                  {c.count} {c.label.toLowerCase()}
                </span>
              </span>
            ))}
          </div>

          {doc.stacks.length > 0 && (
            <p className="mt-3 text-[13px] text-tertiary">
              Built with {doc.stacks.join(", ")}.
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-[13px] font-medium text-tertiary">
            How to read this
          </h2>
          <div className="mt-2.5 space-y-1.5">
            {(["screen", "door", "logic", "data"] as NodeKind[]).map((kind) => (
              <div key={kind} className="flex items-baseline gap-2.5">
                <span
                  className="mt-1 h-3 w-[4px] shrink-0 rounded-full"
                  style={{ background: KIND_COLOR[kind] }}
                />
                <span className="text-[14px] text-primary">
                  <strong className="font-medium">
                    {KIND_COPY[kind].plural}
                  </strong>{" "}
                  — <span className="text-secondary">{KIND_COPY[kind].blurb}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        {doc.groups.map((group) => (
          <section key={group.name} className="mt-12">
            <h2 className="text-[26px] leading-[1.2] font-bold tracking-[-0.025em] text-primary">
              {group.name}
            </h2>
            <p className="mt-1 text-[13px] text-tertiary">
              {group.pieces.length}{" "}
              {group.pieces.length === 1 ? "piece" : "pieces"}
            </p>
            <div className="mt-2">
              {group.pieces.map((p) => (
                <Piece key={`${p.file}:${p.code}`} piece={p} />
              ))}
            </div>
          </section>
        ))}

        <footer className="mt-14 pt-6 text-[13px] leading-[1.6] text-tertiary shadow-[inset_0_1px_0_0_var(--border)]">
          <p>
            Read {doc.filesScanned} of {doc.filesTotal} files.
            {doc.hiddenCount > 0 && (
              <> {doc.hiddenCount} quieter pieces were left out to keep this readable.</>
            )}
          </p>
          <p className="mt-1">Generated by Codarc.</p>
        </footer>
      </main>
    </div>
  );
}
