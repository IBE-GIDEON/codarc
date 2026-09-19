"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

/**
 * Settles its children into place the first time they scroll into view.
 *
 * Deliberately one-way — nothing re-animates when you scroll back up, which
 * is the difference between a page that feels alive and one that feels busy.
 * Content is visible from the start if JavaScript never runs.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
}: {
  as?: React.ElementType;
  /** Milliseconds, for staggering siblings. Keep under ~240. */
  delay?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.dataset.shown = "true";
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).dataset.shown = "true";
        io.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      data-shown="false"
      className={cn("rise", className)}
      style={{ "--rise-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}
