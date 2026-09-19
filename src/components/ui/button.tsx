"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

// Notion buttons are quiet. `secondary` is the workhorse — a hairline box on
// the page background. `primary` is rationed to one per view.
const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[inset_0_0_0_1px_rgb(15_15_15/0.1)] hover:bg-accent-hover",
  secondary:
    "bg-raised text-primary shadow-card hover:bg-hover active:bg-active",
  ghost: "text-secondary hover:bg-hover active:bg-active hover:text-primary",
  danger: "text-c-red hover:bg-c-red-bg",
};

const sizes: Record<Size, string> = {
  sm: "h-control-sm px-1.5 text-[12px] gap-1",
  md: "h-control px-2 text-[14px] gap-1.5",
  lg: "h-control-lg px-3 text-[14px] gap-1.5",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className,
  variant = "secondary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        // 20ms is Notion's hover timing — fast enough to feel like the
        // surface is reacting to the cursor, not animating.
        "inline-flex select-none items-center justify-center rounded-sm font-medium",
        "whitespace-nowrap transition-[background,color] duration-[20ms] ease-in",
        "disabled:pointer-events-none disabled:opacity-40",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

/** Square icon-only button — the sidebar/toolbar workhorse. */
export function IconButton({
  className,
  variant = "ghost",
  size = "md",
  ...props
}: ButtonProps) {
  const square =
    size === "sm" ? "size-control-sm" : size === "lg" ? "size-control-lg" : "size-control";
  return (
    <Button
      variant={variant}
      size={size}
      className={cn("px-0", square, className)}
      {...props}
    />
  );
}
