import * as React from "react";
import { GripVertical, MessageSquare, MoreHorizontal, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

/** 45px top bar. Breadcrumb left, quiet actions right. No border, no shadow. */
export function TopBar({ trail }: { trail: string[] }) {
  return (
    <header className="sticky top-0 z-10 flex h-[45px] shrink-0 items-center gap-1 bg-page/80 px-3 backdrop-blur-sm">
      <nav className="flex min-w-0 items-center text-[14px]">
        {trail.map((crumb, i) => (
          <React.Fragment key={crumb}>
            {i > 0 && <span className="px-1 text-ghost">/</span>}
            <span
              className={cn(
                "notion-hover cursor-pointer truncate px-1.5 py-0.5",
                i === trail.length - 1 ? "text-primary" : "text-secondary",
              )}
            >
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-0.5">
        <ThemeToggle />
        <IconButton aria-label="Comments">
          <MessageSquare className="size-4" />
        </IconButton>
        <IconButton aria-label="Favorite">
          <Star className="size-4" />
        </IconButton>
        <IconButton aria-label="More">
          <MoreHorizontal className="size-4" />
        </IconButton>
      </div>
    </header>
  );
}

/** The 708px reading column. Everything on a page lives inside this. */
export function Column({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  // Notion's 708px is the *content* width — the 96px gutters sit outside it,
  // so the column needs two elements, not one.
  return (
    <div className={cn("px-6 md:px-24", className)}>
      <div className="mx-auto w-full max-w-reading">{children}</div>
    </div>
  );
}

/** Page icon + 40px title, exactly how a Notion doc opens. */
export function PageHeader({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="pt-8 pb-2">
      <div className="mb-2 cursor-pointer text-[78px] leading-none">{icon}</div>
      <h1 className="text-[40px] font-bold leading-[1.2] tracking-[-0.022em] text-primary">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-[16px] leading-6 text-tertiary">{subtitle}</p>
      ) : null}
    </div>
  );
}

/**
 * A content block with the drag handle that appears in the left gutter on
 * hover. This is the interaction that makes a page feel like Notion rather
 * than like a website, so it lives in the design system, not in one page.
 */
export function Block({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("reveal-parent group relative", className)}>
      <div className="reveal absolute top-0 -left-6 flex h-7 items-center">
        <button
          className="grid size-5 cursor-grab place-items-center rounded-xs text-ghost hover:bg-hover"
          aria-label="Drag block"
        >
          <GripVertical className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return (
    <Block className="mt-10 mb-1">
      <h2 className="text-[24px] font-semibold leading-[1.3] tracking-[-0.01em] text-primary">
        {children}
      </h2>
    </Block>
  );
}

export function P({ children }: { children: React.ReactNode }) {
  return (
    <Block className="my-1">
      <p className="text-[16px] leading-[1.5] text-primary">{children}</p>
    </Block>
  );
}

/** Inline code — the tinted red-on-blush treatment Notion uses everywhere. */
export function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-xs bg-c-red-bg px-1 py-0.5 font-mono text-[85%] text-c-red">
      {children}
    </code>
  );
}
