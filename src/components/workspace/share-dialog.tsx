"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Copy, Link2, Loader2, X } from "lucide-react";
import type { GraphNode } from "@/lib/graph";
import { Button, IconButton } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";

type Phase =
  | { at: "compose" }
  | { at: "making" }
  | { at: "made"; url: string }
  | { at: "failed"; error: string; hint: string; needsPlan?: boolean };

export function ShareDialog({
  owner,
  repo,
  layoutKey,
  selected,
  onClose,
}: {
  owner: string;
  repo: string;
  /** Where the canvas keeps this map's arrangement, so the link can carry it. */
  layoutKey: string;
  selected: GraphNode | null;
  onClose: () => void;
}) {
  const [note, setNote] = React.useState("");
  const [focusOn, setFocusOn] = React.useState(Boolean(selected));
  const [phase, setPhase] = React.useState<Phase>({ at: "compose" });
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function make() {
    setPhase({ at: "making" });

    let offsets = {};
    try {
      offsets = JSON.parse(localStorage.getItem(layoutKey) ?? "{}");
    } catch {}

    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: `${owner}/${repo}`,
          note,
          focus: focusOn && selected ? selected.id : undefined,
          offsets,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPhase({
          at: "failed",
          error: body.error ?? "We couldn't make a link",
          hint: body.hint ?? "Try again.",
          needsPlan: body.needsPlan,
        });
        return;
      }
      setPhase({ at: "made", url: body.url });
    } catch {
      setPhase({
        at: "failed",
        error: "We couldn't reach Codarc",
        hint: "Check your connection and try again.",
      });
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-[rgb(15_15_15/0.4)] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Share this map"
        className="w-[min(440px,100%)] rounded-xl bg-raised p-5 shadow-modal"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-primary">
              Share this map
            </h2>
            <p className="mt-1 text-[13px] leading-[1.5] text-secondary">
              Anyone with the link can look around — no account, nothing to
              install. They can&apos;t change anything.
            </p>
          </div>
          <IconButton size="sm" onClick={onClose} aria-label="Close">
            <X className="size-3.5" />
          </IconButton>
        </div>

        {phase.at === "made" ? (
          <div className="mt-5">
            <div className="flex items-center gap-2 rounded-md bg-sunken px-3 py-2 shadow-[inset_0_0_0_1px_var(--border)]">
              <Link2 className="size-3.5 shrink-0 text-tertiary" />
              <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-secondary">
                {phase.url}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={() => copy(phase.url)}
              >
                {copied ? (
                  <>
                    <Check className="size-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="size-3.5" /> Copy link
                  </>
                )}
              </Button>
              <a href={phase.url} target="_blank" rel="noreferrer">
                <Button variant="secondary" size="lg">
                  Open it
                </Button>
              </a>
            </div>
            <p className="mt-3 text-[12px] leading-[1.5] text-tertiary">
              The link shows your map as you&apos;ve arranged it right now, and
              works for 90 days.
            </p>
          </div>
        ) : (
          <div className="mt-5">
            <label className="mb-1.5 block text-[12px] font-medium text-tertiary">
              A note for whoever opens it
            </label>
            <Textarea
              rows={2}
              maxLength={280}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. This is how the app fits together — start with the Reddit bit."
              className="text-[13px]"
            />

            {selected && (
              <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={focusOn}
                  onChange={(e) => setFocusOn(e.target.checked)}
                  className="mt-[3px] accent-[var(--accent)]"
                />
                <span className="text-[13px] leading-[1.5] text-secondary">
                  Open straight to{" "}
                  <span className="font-medium text-primary">
                    {selected.title}
                  </span>
                </span>
              </label>
            )}

            {phase.at === "failed" && (
              <div className="mt-3 rounded-sm bg-c-yellow-bg p-3">
                <div className="text-[13px] font-medium text-primary">
                  {phase.error}
                </div>
                <p className="mt-0.5 text-[12.5px] leading-[1.5] text-secondary">
                  {phase.hint}
                </p>
                {phase.needsPlan && (
                  <Link
                    href={`/choose?back=${encodeURIComponent(`/r/${owner}/${repo}`)}`}
                    className="mt-2 inline-block"
                  >
                    <Button variant="primary" size="md">
                      See the plans
                    </Button>
                  </Link>
                )}
              </div>
            )}

            <Button
              variant="primary"
              size="lg"
              className="mt-4 w-full"
              disabled={phase.at === "making"}
              onClick={make}
            >
              {phase.at === "making" ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Making the link
                </>
              ) : (
                <>
                  <Link2 className="size-3.5" /> Create link
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
