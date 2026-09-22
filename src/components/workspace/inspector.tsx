"use client";

import * as React from "react";
import {
  ArrowRight,
  FileCode2,
  GitPullRequest,
  Loader2,
  Lock,
  RotateCcw,
  X,
} from "lucide-react";
import type { GraphNode, RepoMap } from "@/lib/graph";
import { KIND_LEGEND, KIND_COLOR } from "@/components/workspace/kind";
import { DiffView, type ProposalView } from "@/components/workspace/diff-view";
import { ImpactPanel } from "@/components/workspace/impact-panel";
import { Button, IconButton } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { GithubMark } from "@/components/brand-marks";

type Phase =
  | { at: "idle" }
  | { at: "drafting" }
  | { at: "failed"; error: string; hint: string }
  | { at: "ready"; proposal: ProposalView }
  | { at: "sending"; proposal: ProposalView }
  | {
      at: "sendFailed";
      proposal: ProposalView;
      error: string;
      hint: string;
    }
  | { at: "sent"; url: string; number: number };

/** Forwards `?as=customer` so the owner can preview their own paywall. */
function capabilitiesUrl() {
  if (typeof window === "undefined") return "/api/capabilities";
  const as = new URLSearchParams(window.location.search).get("as");
  return as ? `/api/capabilities?as=${encodeURIComponent(as)}` : "/api/capabilities";
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1.5 text-[11px] font-medium text-tertiary">{children}</div>
  );
}

const WAITING = [
  "Reading the file this came from",
  "Working out the smallest change",
  "Checking it fits the code around it",
];

function Drafting() {
  const [i, setI] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(
      () => setI((n) => Math.min(n + 1, WAITING.length - 1)),
      4200,
    );
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-center gap-2 rounded-sm bg-sunken px-3 py-2.5">
      <Loader2 className="size-3.5 shrink-0 animate-spin text-accent" />
      <span className="text-[12.5px] text-secondary">{WAITING[i]}…</span>
    </div>
  );
}

export function Inspector({
  node,
  map,
  onClose,
  onSelect,
  readOnly = false,
}: {
  node: GraphNode;
  map: RepoMap;
  onClose: () => void;
  onSelect: (id: string) => void;
  /** A shared map: everything to understand the app, nothing to change it. */
  readOnly?: boolean;
}) {
  // The parent keys this by node id, so selecting another node remounts and
  // the draft resets on its own.
  const [draft, setDraft] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>({ at: "idle" });
  const [caps, setCaps] = React.useState<{
    signedIn: boolean;
    canSignIn: boolean;
    hasPlan: boolean;
    canEdit: boolean;
    canDraft: boolean;
    canSend: boolean;
    connected: boolean;
  }>({
    signedIn: true,
    canSignIn: true,
    hasPlan: true,
    canEdit: true,
    canDraft: true,
    canSend: true,
    connected: false,
  });
  const legend = KIND_LEGEND.find((l) => l.kind === node.kind);

  // What this deployment can do lives on the server — the install cookie is
  // httpOnly and the keys obviously aren't public. Asked again every half
  // minute and whenever the window comes back into focus, so a team owner
  // switching someone to view only shows up here without a reload.
  React.useEffect(() => {
    let live = true;
    const load = () =>
      fetch(capabilitiesUrl())
        .then((r) => r.json())
        .then((d) => {
          if (live) setCaps(d);
        })
        .catch(() => {});
    load();
    const timer = window.setInterval(load, 30_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const connected = caps.connected;

  const here =
    typeof window === "undefined"
      ? "/"
      : window.location.pathname + window.location.search;

  const href = `https://github.com/${map.owner}/${map.repo}/blob/${map.branch}/${node.file}#L${node.line}`;

  async function draftChange() {
    setPhase({ at: "drafting" });
    try {
      const res = await fetch("/api/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: `${map.owner}/${map.repo}`,
          branch: map.branch,
          node,
          instruction: draft,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPhase({
          at: "failed",
          error: body.error ?? "That didn't work",
          hint: body.hint ?? "Try again.",
        });
        return;
      }
      setPhase({ at: "ready", proposal: body as ProposalView });
    } catch {
      setPhase({
        at: "failed",
        error: "We couldn't reach Codarc",
        hint: "Check your connection and try again.",
      });
    }
  }

  async function send(proposal: ProposalView) {
    setPhase({ at: "sending", proposal });
    try {
      const res = await fetch("/api/pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: proposal.proposalId }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPhase({
          at: "sendFailed",
          proposal,
          error: body.error ?? "We couldn't send it",
          hint: body.hint ?? "Try again.",
        });
        return;
      }
      setPhase({ at: "sent", url: body.url, number: body.number });
    } catch {
      setPhase({
        at: "sendFailed",
        proposal,
        error: "We couldn't reach Codarc",
        hint: "Nothing was sent. Check your connection and try again.",
      });
    }
  }

  const shown =
    phase.at === "ready" ||
    phase.at === "sending" ||
    phase.at === "sendFailed"
      ? phase.proposal
      : null;

  return (
    <aside
      data-tour="inspector"
      className="pointer-events-auto flex max-h-full w-[368px] flex-col overflow-hidden rounded-xl bg-raised shadow-popover"
    >
      <div className="flex items-start gap-2.5 px-4 pt-4">
        <span
          className="mt-0.5 h-8 w-[6px] shrink-0 rounded-full"
          style={{ background: KIND_COLOR[node.kind] }}
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-primary">
            {node.title}
          </h2>
          <p className="truncate font-mono text-[11px] text-tertiary">
            {node.code}
          </p>
        </div>
        <IconButton size="sm" onClick={onClose} aria-label="Close">
          <X className="size-3.5" />
        </IconButton>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-1">
        <p className="text-[13.5px] leading-[1.55] text-primary">
          {node.summary}
        </p>
        {legend && (
          <p className="mt-2 text-[12.5px] leading-[1.5] text-tertiary">
            {legend.hint}
          </p>
        )}

        <div className="mt-5">
          <Label>Where this lives</Label>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="notion-hover -mx-1.5 flex items-center gap-2 px-1.5 py-1"
          >
            <FileCode2 className="size-3.5 shrink-0 text-tertiary" />
            <span className="truncate font-mono text-[12px] text-secondary">
              {node.file}
            </span>
            <span className="ml-auto shrink-0 font-mono text-[11px] text-ghost">
              line {node.line}
            </span>
          </a>
        </div>

        {phase.at === "idle" && (
          <ImpactPanel map={map} node={node} onSelect={onSelect} />
        )}

        {node.related.length > 0 && phase.at === "idle" && (
          <div className="mt-4">
            <Label>What it reaches into</Label>
            <div className="space-y-px">
              {node.related.map((r) => (
                <div
                  key={r}
                  className="notion-hover -mx-1.5 truncate px-1.5 py-1 font-mono text-[11.5px] text-tertiary"
                >
                  {r}
                </div>
              ))}
            </div>
          </div>
        )}

        {!readOnly && (
        <div className="mt-5" data-tour="change">
          <Label>Change it</Label>

          {!caps.signedIn ? (
            <div className="rounded-sm bg-c-blue-bg p-3">
              <p className="text-[12.5px] leading-[1.55] text-primary">
                Sign in to change things.
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-secondary">
                Looking is free and needs no account. Codarc only needs to know
                who you are before it touches your code.
              </p>
            </div>
          ) : !caps.hasPlan ? (
            <div className="rounded-sm bg-c-yellow-bg p-3">
              <p className="text-[12.5px] leading-[1.55] text-primary">
                Looking is free. Changing needs a plan.
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-secondary">
                Codarc reads your real code and writes a real change, so from
                here on it costs money to run.
              </p>
            </div>
          ) : !caps.canEdit ? (
            <div className="rounded-sm bg-c-gray-bg p-3">
              <p className="text-[12.5px] leading-[1.55] text-primary">
                You&apos;re set to view only.
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-secondary">
                Your team&apos;s owner decides who can change things. You can still
                look around, search, and share this map.
              </p>
            </div>
          ) : !caps.canDraft ? (
            <div className="rounded-sm bg-c-gray-bg p-3">
              <p className="text-[12.5px] leading-[1.55] text-primary">
                Changing your app from here isn&apos;t switched on yet.
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.5] text-secondary">
                Reading and mapping works today. Making the change for you is
                the next thing being turned on.
              </p>
            </div>
          ) : phase.at === "sent" ? (
            <div className="rounded-sm bg-c-green-bg p-3">
              <p className="text-[13px] leading-[1.55] text-primary">
                Sent. It&apos;s waiting for you on GitHub as pull request #
                {phase.number}. Nothing has changed in your live app until you
                accept it there.
              </p>
            </div>
          ) : shown ? (
            <div className="space-y-3">
              <div className="rounded-sm bg-c-green-bg p-3">
                <p className="text-[13px] leading-[1.55] text-primary">
                  {shown.summary}
                </p>
                <p className="mt-1.5 font-mono text-[11px] text-c-green">
                  +{shown.added} −{shown.removed} across {shown.files.length}{" "}
                  {shown.files.length === 1 ? "file" : "files"}
                </p>
              </div>

              {shown.caveat && (
                <div className="rounded-sm bg-c-yellow-bg p-3 text-[12.5px] leading-[1.5] text-primary">
                  {shown.caveat}
                </div>
              )}

              {phase.at === "sendFailed" && (
                <div className="rounded-sm bg-c-red-bg p-2.5">
                  <div className="text-[12.5px] font-medium text-primary">
                    {phase.error}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-[1.45] text-secondary">
                    {phase.hint}
                  </p>
                </div>
              )}

              <DiffView proposal={shown} />
            </div>
          ) : phase.at === "drafting" ? (
            <Drafting />
          ) : (
            <>
              <Textarea
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Say what this should do differently, in your own words."
                className="text-[13px]"
              />
              {phase.at === "failed" ? (
                <div className="mt-2 rounded-sm bg-c-red-bg p-2.5">
                  <div className="text-[12.5px] font-medium text-primary">
                    {phase.error}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-[1.45] text-secondary">
                    {phase.hint}
                  </p>
                </div>
              ) : (
                <p className="mt-1.5 text-[11.5px] leading-[1.45] text-tertiary">
                  You never have to say <em>where</em> — Codarc already knows
                  this is{" "}
                  <span className="font-mono">
                    {node.file.split("/").pop()}
                  </span>
                  .
                </p>
              )}
            </>
          )}
        </div>
        )}

      </div>

      <div className="space-y-2 px-4 pt-3 pb-4">
        {readOnly ? (
          <a href={href} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="lg" className="w-full">
              <FileCode2 className="size-3.5" /> Read this on GitHub
            </Button>
          </a>
        ) : !caps.signedIn ? (
          <a
            href={
              caps.canSignIn
                ? `/api/auth/github?back=${encodeURIComponent(here)}`
                : href
            }
            target={caps.canSignIn ? undefined : "_blank"}
            rel={caps.canSignIn ? undefined : "noreferrer"}
          >
            <Button variant="primary" size="lg" className="w-full">
              {caps.canSignIn ? (
                <>
                  <GithubMark className="size-3.5" /> Sign in with GitHub
                </>
              ) : (
                <>
                  <FileCode2 className="size-3.5" /> Read this on GitHub
                </>
              )}
            </Button>
          </a>
        ) : !caps.hasPlan ? (
          <a href={`/choose?back=${encodeURIComponent(here)}`}>
            <Button variant="primary" size="lg" className="w-full">
              See the plans <ArrowRight className="size-3.5" />
            </Button>
          </a>
        ) : !caps.canDraft ? (
          <a href={href} target="_blank" rel="noreferrer">
            <Button variant="secondary" size="lg" className="w-full">
              <FileCode2 className="size-3.5" /> Read this on GitHub
            </Button>
          </a>
        ) : phase.at === "sent" ? (
          <>
            <a href={phase.url} target="_blank" rel="noreferrer">
              <Button variant="primary" size="lg" className="w-full">
                <GitPullRequest className="size-3.5" /> Open it on GitHub
              </Button>
            </a>
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => {
                setDraft("");
                setPhase({ at: "idle" });
              }}
            >
              <RotateCcw className="size-3.5" /> Change something else
            </Button>
          </>
        ) : shown ? (
          <>
            {connected ? (
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={phase.at === "sending"}
                onClick={() => send(shown)}
              >
                {phase.at === "sending" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Sending
                  </>
                ) : (
                  <>
                    <GitPullRequest className="size-3.5" /> Send it to GitHub
                  </>
                )}
              </Button>
            ) : (
              <div className="rounded-sm bg-c-blue-bg p-3">
                <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-primary">
                  <Lock className="size-3.5" /> Connect GitHub to send this
                </div>
                <p className="mt-1 text-[12px] leading-[1.5] text-secondary">
                  Nothing has been written yet. Codarc needs your permission on
                  this repository before it can hand the change over.
                </p>
                <a href={`/api/github/install?back=${encodeURIComponent(here)}`}>
                  <Button variant="primary" size="md" className="mt-2.5 w-full">
                    <GitPullRequest className="size-3.5" /> Connect GitHub
                  </Button>
                </a>
              </div>
            )}
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              disabled={phase.at === "sending"}
              onClick={() => {
                setDraft("");
                setPhase({ at: "idle" });
              }}
            >
              <RotateCcw className="size-3.5" /> Ask for something else
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!draft.trim() || phase.at === "drafting"}
            onClick={draftChange}
          >
            {phase.at === "drafting" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> Working on it
              </>
            ) : (
              <>
                Draft the change <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        )}
      </div>
    </aside>
  );
}
