import { Check, MousePointer2, X } from "lucide-react";
import { GithubMark } from "@/components/brand-marks";
import { cn } from "@/lib/cn";

/**
 * The four pictures beside "How it works".
 *
 * Rule for this file: **no code on screen.** The person reading it has never
 * opened a file in their life — the moment a path or a symbol appears they
 * decide this isn't for them. Everything is shown as plain English, a shape,
 * or a colour from the canvas legend.
 */

function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex size-full flex-col justify-center rounded-xl bg-raised p-6 shadow-card",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 1 — a permission slip, the way any app asks to connect to another. */
export function ConnectVisual() {
  return (
    <Panel>
      <div className="mx-auto w-full max-w-[320px]">
        <div className="flex items-center gap-2.5">
          <GithubMark className="size-5 text-primary" />
          <div className="min-w-0">
            <div className="text-[14px] font-medium text-primary">your-app</div>
            <div className="text-[12px] text-tertiary">
              the project you already have
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2.5">
          {[
            "Let Codarc read this project",
            "Let Codarc suggest changes to it",
          ].map((line) => (
            <div key={line} className="flex items-start gap-2.5">
              <span className="mt-[1px] grid size-4 shrink-0 place-items-center rounded-xs bg-accent">
                <Check className="size-3 text-white" strokeWidth={3} />
              </span>
              <span className="text-[13px] leading-[1.5] text-secondary">
                {line}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-5 grid h-9 place-items-center rounded-sm bg-accent text-[13.5px] font-medium text-white">
          Allow
        </div>
        <p className="mt-2.5 text-center text-[11.5px] text-tertiary">
          You choose which projects. You can take it back any time.
        </p>
      </div>
    </Panel>
  );
}

const MAP = [
  {
    hue: "var(--c-green)",
    label: "Screens",
    items: ["Home page", "Sign-in page"],
  },
  {
    hue: "var(--brand-purple)",
    label: "Doors",
    items: ["Sign in", "Take payment", "Sign up"],
  },
  { hue: "var(--brand-blue)", label: "Logic", items: ["Accounts", "Billing"] },
  { hue: "var(--brand-amber)", label: "Data", items: ["Customer", "Order"] },
];

/** 2 — the map itself, labelled in words instead of filenames. */
export function MapVisual() {
  return (
    <Panel className="canvas-grid">
      <div className="flex items-stretch justify-between gap-2">
        {MAP.map((col) => (
          <div key={col.label} className="flex flex-1 flex-col justify-center gap-2">
            <div className="mb-0.5 flex items-center gap-1.5">
              <span
                className="h-2.5 w-[3px] rounded-full"
                style={{ background: col.hue }}
              />
              <span className="text-[10px] font-medium text-tertiary">
                {col.label}
              </span>
            </div>
            {col.items.map((item) => (
              <div
                key={item}
                className="flex items-center gap-1.5 rounded-sm bg-raised px-1.5 py-1.5 shadow-card"
              >
                <span
                  className="h-4 w-[3px] shrink-0 rounded-full"
                  style={{ background: col.hue }}
                />
                <span className="truncate text-[10.5px] text-secondary">
                  {item}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="mt-5 text-center text-[11.5px] leading-[1.5] text-tertiary">
        Every box is one real piece of your app.
        <br />
        Lines run left to right, the way a request travels.
      </p>
    </Panel>
  );
}

/** 3 — pointing at a box and saying what you want, out loud. */
export function PointVisual() {
  return (
    <Panel>
      <div className="mx-auto w-full max-w-[320px]">
        <div className="relative flex items-center gap-2 rounded-lg bg-page px-3 py-2.5 shadow-[0_0_0_2px_var(--accent),var(--shadow-card)]">
          <span
            className="h-6 w-[5px] shrink-0 rounded-full"
            style={{ background: "var(--brand-purple)" }}
          />
          <span className="text-[13px] font-medium text-primary">Sign in</span>
          <MousePointer2 className="absolute -right-1 -bottom-2 size-4 text-accent" />
        </div>

        <div className="mt-6 rounded-lg rounded-tl-xs bg-sunken p-3 shadow-[inset_0_0_0_1px_var(--border)]">
          <p className="text-[13.5px] leading-[1.5] text-primary">
            &ldquo;Lock people out after 5 wrong tries.&rdquo;
          </p>
        </div>

        <p className="mt-3 text-center text-[11.5px] leading-[1.5] text-tertiary">
          Your words. Not a form, not a setting,
          <br />
          and never a file name.
        </p>
      </div>
    </Panel>
  );
}

/** 4 — before and after, in sentences rather than a diff. */
export function ApproveVisual() {
  return (
    <Panel>
      <div className="mx-auto w-full max-w-[330px]">
        <div className="text-[11px] font-medium text-tertiary">
          What happens today
        </div>
        <div className="mt-1.5 flex items-start gap-2.5 rounded-sm bg-c-red-bg p-3">
          <X className="mt-[2px] size-3.5 shrink-0 text-c-red" strokeWidth={2.5} />
          <span className="text-[12.5px] leading-[1.5] text-primary">
            Anyone can guess a password as many times as they like.
          </span>
        </div>

        <div className="mt-4 text-[11px] font-medium text-tertiary">
          What happens after
        </div>
        <div className="mt-1.5 flex items-start gap-2.5 rounded-sm bg-c-green-bg p-3">
          <Check className="mt-[2px] size-3.5 shrink-0 text-c-green" strokeWidth={2.5} />
          <span className="text-[12.5px] leading-[1.5] text-primary">
            After 5 wrong tries they&apos;re locked out for 15 minutes.
          </span>
        </div>

        <div className="mt-5 flex gap-2">
          <div className="grid h-9 flex-1 place-items-center rounded-sm bg-accent text-[13px] font-medium text-white">
            Approve
          </div>
          <div className="grid h-9 flex-1 place-items-center rounded-sm bg-page text-[13px] font-medium text-secondary shadow-card">
            Not this one
          </div>
        </div>
        <p className="mt-2.5 text-center text-[11.5px] text-tertiary">
          Nothing reaches your live app until you say so.
        </p>
      </div>
    </Panel>
  );
}
