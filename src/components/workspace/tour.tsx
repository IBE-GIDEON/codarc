"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export type TourStep = {
  id: string;
  /** `data-tour` value of the thing to point at. Omit to centre the card. */
  target?: string;
  title: string;
  body: string;
  placement?: "right" | "left" | "top" | "bottom" | "center";
  /** Put the app into the state this step talks about. */
  before?: () => void;
};

const CARD_W = 328;
const GAP = 14;
const PAD = 8;

type Box = { top: number; left: number; width: number; height: number };

export function Tour({
  steps,
  open,
  onClose,
}: {
  steps: TourStep[];
  open: boolean;
  onClose: (completed: boolean) => void;
}) {
  const [i, setI] = React.useState(0);
  const [hole, setHole] = React.useState<Box | null>(null);
  const [cardH, setCardH] = React.useState(200);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const step = steps[i];
  const last = i === steps.length - 1;

  // Run the step's setup, then measure where its target ended up. The measure
  // happens in a frame callback so the DOM has settled and any canvas glide
  // has begun from the right place.
  React.useEffect(() => {
    if (!open || !step) return;
    step.before?.();

    let frame = 0;
    let cancelled = false;

    const measure = () => {
      if (cancelled) return;
      if (!step.target) {
        setHole(null);
        return;
      }
      const el = document.querySelector<HTMLElement>(
        `[data-tour="${step.target}"]`,
      );
      if (!el) {
        setHole(null);
        return;
      }
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      const r = el.getBoundingClientRect();
      setHole({
        top: r.top - PAD,
        left: r.left - PAD,
        width: r.width + PAD * 2,
        height: r.height + PAD * 2,
      });
    };

    // Two frames: one for React to commit `before()`, one for layout.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(measure);
    });

    const onShift = () => measure();
    window.addEventListener("resize", onShift);
    window.addEventListener("scroll", onShift, true);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onShift);
      window.removeEventListener("scroll", onShift, true);
    };
  }, [open, step]);

  // Card height drives clamping, and it changes with the body text.
  React.useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setCardH(e.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose(false);
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        setI((n) => (n + 1 < steps.length ? n + 1 : n));
        if (last) onClose(true);
      }
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, last, steps.length, onClose]);

  if (!open || !step) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(v, max));

  let left = (vw - CARD_W) / 2;
  let top = (vh - cardH) / 2;

  if (hole) {
    const place = step.placement ?? "right";
    if (place === "right") {
      left = hole.left + hole.width + GAP;
      top = hole.top;
    } else if (place === "left") {
      left = hole.left - CARD_W - GAP;
      top = hole.top;
    } else if (place === "bottom") {
      left = hole.left;
      top = hole.top + hole.height + GAP;
    } else if (place === "top") {
      left = hole.left;
      top = hole.top - cardH - GAP;
    }
    // If it won't fit on the chosen side, flip rather than hang off-screen.
    if (left + CARD_W > vw - 12) left = hole.left - CARD_W - GAP;
    if (left < 12) left = hole.left + hole.width + GAP;
  }

  left = clamp(left, 12, Math.max(12, vw - CARD_W - 12));
  top = clamp(top, 12, Math.max(12, vh - cardH - 12));

  return (
    <div className="fixed inset-0 z-50">
      {/* One element does the dimming: a huge spread shadow around the hole. */}
      {hole ? (
        <div
          className="pointer-events-none absolute rounded-lg transition-all duration-300 ease-[var(--ease-soft)]"
          style={{
            top: hole.top,
            left: hole.left,
            width: hole.width,
            height: hole.height,
            boxShadow:
              "0 0 0 9999px rgb(15 15 15 / 0.52), 0 0 0 2px var(--accent)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgb(15_15_15/0.52)]" />
      )}

      {/* Swallows clicks so nothing changes underneath mid-tour. */}
      <div className="absolute inset-0" onClick={() => {}} />

      <div
        ref={cardRef}
        role="dialog"
        aria-label="Guided tour"
        className={cn(
          "absolute w-[328px] rounded-xl bg-raised p-4 shadow-modal",
          "transition-[top,left] duration-300 ease-[var(--ease-soft)]",
        )}
        style={{ top, left }}
      >
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {steps.map((s, n) => (
              <span
                key={s.id}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  n === i ? "w-4 bg-accent" : "w-1 bg-[rgb(var(--ink)/0.18)]",
                )}
              />
            ))}
          </div>
          <span className="ml-auto font-mono text-[11px] text-tertiary">
            {i + 1}/{steps.length}
          </span>
        </div>

        <h2 className="mt-3 text-[15px] font-semibold tracking-[-0.01em] text-primary">
          {step.title}
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-[1.55] text-secondary">
          {step.body}
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => onClose(false)}
            className="notion-hover -ml-1.5 px-1.5 py-1 text-[13px] text-tertiary hover:text-secondary"
          >
            Skip
          </button>
          <div className="ml-auto flex gap-1.5">
            {i > 0 && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setI((n) => Math.max(0, n - 1))}
              >
                Back
              </Button>
            )}
            <Button
              variant="primary"
              size="md"
              onClick={() => (last ? onClose(true) : setI((n) => n + 1))}
            >
              {last ? "Got it" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
