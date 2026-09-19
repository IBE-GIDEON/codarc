import * as React from "react";
import { cn } from "@/lib/cn";

/* Landing-page primitives.
   The marketing surface is the one place the brand is allowed to be loud —
   gradients, glows, saturated hue. The app chrome stays Notion-quiet. */

export function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-[1120px] px-6", className)}>
      {children}
    </div>
  );
}

export function Section({
  className,
  children,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className={cn("py-20 md:py-28", className)}>
      {children}
    </section>
  );
}

/** Small tertiary label that sits above a section heading. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[13px] font-medium tracking-[0.01em] text-tertiary">
      {children}
    </div>
  );
}

export function SectionTitle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <h2
      className={cn(
        "text-[32px] leading-[1.15] font-bold tracking-[-0.025em] text-primary md:text-[40px]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function Lede({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 max-w-[54ch] text-[17px] leading-[1.55] text-secondary">
      {children}
    </p>
  );
}

/**
 * The Notion hero device: one word wrapped in a soft pill so the eye lands on
 * the verb that matters. Ours carries the brand triad instead of Notion's
 * single yellow.
 */
export function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-flex items-center gap-[0.26em] whitespace-nowrap rounded-full bg-[linear-gradient(95deg,rgb(107_70_245/0.14),rgb(18_112_248/0.14)_52%,rgb(250_194_73/0.20))] px-[0.36em] py-[0.02em] dark:bg-[linear-gradient(95deg,rgb(146_94_255/0.24),rgb(5_111_255/0.24)_52%,rgb(255_183_45/0.26))]">
      <span className="size-[0.4em] shrink-0 rounded-full bg-[linear-gradient(135deg,var(--brand-purple),var(--brand-blue)_55%,var(--brand-amber))]" />
      {children}
    </span>
  );
}

/** Browser-ish frame for product shots. Hairline, not a heavy chrome bar. */
export function Frame({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl bg-page shadow-modal",
        className,
      )}
    >
      <div className="flex h-9 items-center gap-1.5 bg-sidebar px-3.5">
        <span className="size-[9px] rounded-full bg-[rgb(var(--ink)/0.16)]" />
        <span className="size-[9px] rounded-full bg-[rgb(var(--ink)/0.16)]" />
        <span className="size-[9px] rounded-full bg-[rgb(var(--ink)/0.16)]" />
        <span className="ml-3 truncate font-mono text-[11px] text-tertiary">
          codarc.dev/r/you/trendstack-api
        </span>
      </div>
      {children}
    </div>
  );
}
