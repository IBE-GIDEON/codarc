"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

export function SearchField({
  value,
  onChange,
  count,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Null when nothing is being searched for. */
  count: number | null;
  onEnter: () => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);

  // "/" is the reflex for search; ⌘K for everyone who expects a palette.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const typingElsewhere =
        e.target instanceof HTMLElement &&
        /^(INPUT|TEXTAREA)$/.test(e.target.tagName);

      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) ||
          (e.key === "/" && !typingElsewhere)) {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const empty = count === 0;

  return (
    <div className="px-2 pb-2">
      <div
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-md bg-page px-2",
          "shadow-[inset_0_0_0_1px_var(--border)] transition-shadow duration-150",
          "focus-within:shadow-[inset_0_0_0_1px_var(--accent)]",
          empty && "shadow-[inset_0_0_0_1px_var(--c-red)]",
        )}
      >
        <Search className="size-3.5 shrink-0 text-tertiary" />
        <input
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onEnter();
            if (e.key === "Escape") onChange("");
          }}
          placeholder="Search this app"
          aria-label="Search this app"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-primary outline-none placeholder:text-tertiary"
        />
        {value ? (
          <>
            <span
              className={cn(
                "shrink-0 font-mono text-[11px]",
                empty ? "text-c-red" : "text-tertiary",
              )}
            >
              {count}
            </span>
            <button
              onClick={() => onChange("")}
              aria-label="Clear search"
              className="grid size-4 shrink-0 place-items-center rounded-xs text-tertiary hover:bg-hover"
            >
              <X className="size-3" />
            </button>
          </>
        ) : (
          <kbd className="shrink-0 rounded-xs bg-[rgb(var(--ink)/0.06)] px-1 font-mono text-[10px] text-tertiary">
            /
          </kbd>
        )}
      </div>

      {empty && (
        <p className="mt-1.5 px-0.5 text-[11.5px] leading-[1.45] text-tertiary">
          Nothing matches. Try a plainer word — &ldquo;sign in&rdquo;,
          &ldquo;payment&rdquo;, &ldquo;user&rdquo;.
        </p>
      )}
    </div>
  );
}
