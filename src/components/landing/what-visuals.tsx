import { ArrowRight, Check, Eye, MousePointer2, X } from "lucide-react";
import { GithubMark } from "@/components/brand-marks";

/**
 * Small pictures for the bento. Same rule as the How section: **no code on
 * screen.** Each one should be readable in about a second by someone who has
 * never opened a file.
 */

const PURPLE = "var(--brand-purple)";
const BLUE = "var(--brand-blue)";
const AMBER = "var(--brand-amber)";

function Box({
  label,
  hue = BLUE,
  className = "",
}: {
  label: string;
  hue?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-sm bg-raised px-1.5 py-1 shadow-card ${className}`}
    >
      <span
        className="h-3.5 w-[3px] shrink-0 rounded-full"
        style={{ background: hue }}
      />
      <span className="truncate text-[9.5px] text-secondary">{label}</span>
    </div>
  );
}

/** Arrange it your way; a re-read doesn't undo it. */
export function LayoutVisual() {
  return (
    <div className="flex items-center gap-3">
      <div className="canvas-grid flex-1 rounded-md p-2.5 shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="mb-1 text-[8.5px] text-tertiary">You arranged it</div>
        <div className="relative space-y-1.5">
          <Box label="Sign in" hue={PURPLE} />
          <Box label="Payments" hue={PURPLE} className="ml-4" />
          <Box label="Customer" hue={AMBER} />
          <MousePointer2 className="absolute top-4 left-10 size-3 text-accent" />
        </div>
      </div>

      <ArrowRight className="size-3.5 shrink-0 text-tertiary" />

      <div className="canvas-grid flex-1 rounded-md p-2.5 shadow-[inset_0_0_0_1px_var(--border)]">
        <div className="mb-1 text-[8.5px] text-tertiary">After a re-read</div>
        <div className="space-y-1.5">
          <Box label="Sign in" hue={PURPLE} />
          <Box label="Payments" hue={PURPLE} className="ml-4" />
          <Box label="Customer" hue={AMBER} />
        </div>
      </div>
    </div>
  );
}

/** Point at a thing, talk normally. */
export function DescribeVisual() {
  return (
    <div className="space-y-2.5">
      <div className="relative w-fit rounded-sm bg-page px-2 py-1.5 shadow-[0_0_0_1.5px_var(--accent),var(--shadow-card)]">
        <div className="flex items-center gap-1.5">
          <span
            className="h-3.5 w-[3px] rounded-full"
            style={{ background: BLUE }}
          />
          <span className="text-[10px] font-medium text-primary">Sign in</span>
        </div>
        <MousePointer2 className="absolute -right-1.5 -bottom-1.5 size-3 text-accent" />
      </div>
      <div className="rounded-md rounded-tl-xs bg-sunken p-2.5 shadow-[inset_0_0_0_1px_var(--border)]">
        <p className="text-[11px] leading-[1.45] text-primary">
          &ldquo;Make people wait 15 minutes after 5 wrong passwords.&rdquo;
        </p>
      </div>
    </div>
  );
}

/** See it in words first, then decide. */
export function ReviewVisual() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-2 rounded-sm bg-c-red-bg p-2">
        <X className="mt-px size-3 shrink-0 text-c-red" strokeWidth={2.5} />
        <span className="text-[10px] leading-[1.4] text-primary">
          Unlimited password guesses
        </span>
      </div>
      <div className="flex items-start gap-2 rounded-sm bg-c-green-bg p-2">
        <Check className="mt-px size-3 shrink-0 text-c-green" strokeWidth={2.5} />
        <span className="text-[10px] leading-[1.4] text-primary">
          Locked out after 5 tries
        </span>
      </div>
      <div className="flex gap-1.5 pt-1">
        <div className="grid h-6 flex-1 place-items-center rounded-xs bg-accent text-[9.5px] font-medium text-white">
          Approve
        </div>
        <div className="grid h-6 flex-1 place-items-center rounded-xs bg-page text-[9.5px] font-medium text-secondary shadow-card">
          Discard
        </div>
      </div>
    </div>
  );
}

/** Your running app keeps running. */
export function SafeVisual() {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5 rounded-md bg-page p-2.5 shadow-card">
        <span className="size-2 shrink-0 rounded-full bg-c-green" />
        <span className="flex-1 text-[10.5px] font-medium text-primary">
          Your live app
        </span>
        <span className="text-[9.5px] text-c-green">running, untouched</span>
      </div>

      <div className="ml-5 flex items-center gap-2.5 rounded-md bg-sunken p-2.5 shadow-[inset_0_0_0_1px_var(--border)]">
        <span className="size-2 shrink-0 rounded-full bg-c-yellow" />
        <span className="flex-1 text-[10.5px] font-medium text-primary">
          The proposed change
        </span>
        <span className="text-[9.5px] text-tertiary">waiting for you</span>
      </div>
    </div>
  );
}

/** Read once, answered, gone. */
export function PrivacyVisual() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-1">
      <Eye className="size-5 text-tertiary" strokeWidth={1.75} />
      <div className="flex items-center gap-1.5">
        {["Read", "Answered"].map((s) => (
          <span
            key={s}
            className="rounded-full bg-c-green-bg px-2 py-0.5 text-[9.5px] font-medium text-c-green"
          >
            {s}
          </span>
        ))}
        <span className="relative rounded-full bg-c-red-bg px-2 py-0.5 text-[9.5px] font-medium text-c-red">
          Kept
          <span className="absolute inset-x-1.5 top-1/2 h-px bg-c-red" />
        </span>
      </div>
    </div>
  );
}

/** You hand over one project, not your account. */
export function ScopeVisual() {
  const repos = [
    { name: "your-app", on: true },
    { name: "side-project", on: false },
    { name: "old-thing", on: false },
  ];
  return (
    <div className="space-y-1.5">
      {repos.map((r) => (
        <div
          key={r.name}
          className="flex items-center gap-2 rounded-sm bg-page px-2 py-1.5 shadow-card"
        >
          <GithubMark className="size-3 shrink-0 text-tertiary" />
          <span className="flex-1 truncate text-[10px] text-secondary">
            {r.name}
          </span>
          <span
            className={`flex h-3.5 w-6 items-center rounded-full px-[2px] ${
              r.on ? "justify-end bg-accent" : "justify-start bg-[rgb(var(--ink)/0.14)]"
            }`}
          >
            <span className="size-2.5 rounded-full bg-white" />
          </span>
        </div>
      ))}
    </div>
  );
}
