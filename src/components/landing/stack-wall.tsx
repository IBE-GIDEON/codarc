import { cn } from "@/lib/cn";

/**
 * The stacks Codarc can actually read, laid out as a logo wall.
 *
 * Each name gets its own typographic treatment so the row scans like a wall of
 * marks rather than a list of words — that difference is the whole effect.
 * Monochrome throughout: these are other people's brands and colour here would
 * fight the hero above it.
 */
const STACKS: { name: string; className: string; mark?: "triangle" | "bolt" | "dot" }[] = [
  { name: "Next.js", className: "font-semibold tracking-[-0.045em]", mark: "triangle" },
  { name: "FastAPI", className: "font-semibold tracking-[-0.015em]", mark: "bolt" },
  { name: "Django", className: "font-serif font-medium tracking-[-0.01em]" },
  { name: "express", className: "font-mono font-bold tracking-[-0.06em]" },
  { name: "Flask", className: "font-serif italic font-medium tracking-[-0.005em]" },
  { name: "NestJS", className: "font-semibold tracking-[-0.03em]", mark: "dot" },
  { name: "Prisma", className: "font-medium tracking-[0.02em]" },
  { name: "drizzle", className: "font-mono tracking-[-0.03em]" },
];

function Mark({ kind }: { kind: "triangle" | "bolt" | "dot" }) {
  if (kind === "triangle") {
    return (
      <svg viewBox="0 0 12 12" className="size-[11px] shrink-0" aria-hidden>
        <path d="M6 1.5 L11 10.5 L1 10.5 Z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "bolt") {
    return (
      <svg viewBox="0 0 12 12" className="size-[13px] shrink-0" aria-hidden>
        <path d="M7 1 L3 6.6 H5.6 L5 11 L9 5.4 H6.4 Z" fill="currentColor" />
      </svg>
    );
  }
  return <span className="size-[7px] shrink-0 rounded-full bg-current" />;
}

export function StackWall({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-[880px]", className)}>
      <p className="text-center text-[13px] text-tertiary">
        Reads the tools most AI-built apps are made of
      </p>

      <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4 sm:gap-x-4">
        {STACKS.map(({ name, className: style, mark }) => (
          <div
            key={name}
            className={cn(
              "flex h-7 items-center justify-center gap-1.5 text-[19px] whitespace-nowrap",
              "text-ghost transition-colors duration-200 hover:text-secondary",
              style,
            )}
          >
            {mark && <Mark kind={mark} />}
            {name}
          </div>
        ))}
      </div>
    </div>
  );
}
