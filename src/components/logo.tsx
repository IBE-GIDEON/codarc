import { cn } from "@/lib/cn";

/**
 * The Codarc mark, rebuilt as SVG so it stays crisp and follows the theme.
 * The chevron takes `currentColor`; the three pills are the brand triad and
 * double as the node-type legend on the canvas — purple = routes,
 * blue = services, amber = data.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-8", className)}
      aria-label="Codarc"
      role="img"
    >
      <path
        d="M17.5 7 L9.5 16 L17.5 25"
        stroke="currentColor"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="20" y="8.6" width="8.4" height="4.1" rx="2.05" fill="var(--brand-purple)" />
      <rect x="20" y="13.95" width="8.4" height="4.1" rx="2.05" fill="var(--brand-blue)" />
      <rect x="20" y="19.3" width="8.4" height="4.1" rx="2.05" fill="var(--brand-amber)" />
    </svg>
  );
}

const WORDMARK = {
  sm: { mark: "size-6", text: "text-[15px]" },
  md: { mark: "size-8", text: "text-[19px]" },
  lg: { mark: "size-9", text: "text-[22px]" },
} as const;

/** Mark plus name, locked to one optical relationship at every size. */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: keyof typeof WORDMARK;
  className?: string;
}) {
  const s = WORDMARK[size];
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Logo className={cn(s.mark, "shrink-0 text-primary")} />
      <span
        className={cn(
          "font-semibold tracking-[-0.02em] text-primary",
          s.text,
        )}
      >
        Codarc
      </span>
    </span>
  );
}
