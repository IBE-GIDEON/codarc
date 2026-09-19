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
