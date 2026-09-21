"use client";

import * as React from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { PLANS, type PlanId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * The plan chooser. Picking one opens Lemon Squeezy's payment page; someone
 * already paying goes to their billing page instead, so nobody is billed
 * twice by switching.
 */
export function PlanCards({
  returnTo,
  current = null,
}: {
  returnTo: string;
  /** The plan this person pays for themselves, if any. */
  current?: PlanId | null;
}) {
  const [picking, setPicking] = React.useState<PlanId | null>(null);
  const [result, setResult] = React.useState<{
    error: string;
    hint: string;
  } | null>(null);

  async function choose(plan: PlanId) {
    setPicking(plan);
    setResult(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, returnTo }),
      });
      const body = await res.json();
      if (body.url) {
        // assign() rather than setting location.href — same effect, and the
        // lint rule is right that reassigning a global is a smell.
        window.location.assign(body.url);
        return;
      }
      setResult({
        error: body.error ?? "That didn't work",
        hint: body.hint ?? "Try again in a moment.",
      });
    } catch {
      setResult({
        error: "We couldn't reach Codarc",
        hint: "Check your connection and try again.",
      });
    } finally {
      setPicking(null);
    }
  }

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={cn(
              "flex flex-col rounded-xl p-6",
              p.featured
                ? "bg-page shadow-[0_0_0_1.5px_var(--accent),var(--shadow-card)]"
                : "bg-sunken",
            )}
          >
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-primary">
                {p.name}
              </h2>
              {p.featured && (
                <span className="rounded-full bg-selected px-2 py-0.5 text-[11px] font-medium text-accent-text">
                  Most chosen
                </span>
              )}
            </div>
            <p className="mt-1 text-[13.5px] text-secondary">{p.tagline}</p>

            <div className="mt-5 flex items-baseline gap-1.5">
              <span className="text-[40px] leading-none font-bold tracking-[-0.03em] text-primary">
                ${p.price}
              </span>
              <span className="text-[14px] text-tertiary">/ month</span>
            </div>

            <ul className="mt-6 flex-1 space-y-2.5">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <Check className="mt-[3px] size-3.5 shrink-0 text-c-green" />
                  <span className="text-[13.5px] leading-[1.5] text-secondary">
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            {current ? (
              // Already paying: both cards lead to the billing page, where
              // switching plans adjusts the one bill instead of adding one.
              <a href="/api/billing/portal" className="mt-7 block">
                <Button
                  variant={current === p.id ? "secondary" : p.featured ? "primary" : "secondary"}
                  size="lg"
                  className="h-10 w-full text-[14px]"
                >
                  {current === p.id ? (
                    <>
                      <Check className="size-3.5" /> Your plan · manage billing
                    </>
                  ) : (
                    <>
                      Switch to {p.name} <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>
              </a>
            ) : (
              <Button
                variant={p.featured ? "primary" : "secondary"}
                size="lg"
                className="mt-7 h-10 w-full text-[14px]"
                disabled={picking !== null}
                onClick={() => choose(p.id)}
              >
                {picking === p.id ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" /> Opening the payment page
                  </>
                ) : (
                  <>
                    Choose {p.name} <ArrowRight className="size-3.5" />
                  </>
                )}
              </Button>
            )}
          </div>
        ))}
      </div>

      {result && (
        <div className="mt-4 rounded-md bg-c-yellow-bg p-4">
          <div className="text-[13.5px] font-medium text-primary">
            {result.error}
          </div>
          <p className="mt-1 text-[13px] leading-[1.55] text-secondary">
            {result.hint}
          </p>
        </div>
      )}
    </div>
  );
}
