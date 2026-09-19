"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

// Notion inputs sit *in* the page rather than on it: a sunken tint, a hairline
// inset shadow instead of a border, and no visible box until focus.
export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-control-lg w-full rounded-md bg-sunken px-2 text-[14px] text-primary",
        "shadow-[inset_0_0_0_1px_var(--border)] placeholder:text-tertiary",
        "transition-shadow duration-100",
        "focus:bg-page",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-md bg-sunken p-2 text-[14px] leading-6 text-primary",
        "shadow-[inset_0_0_0_1px_var(--border)] placeholder:text-tertiary",
        "transition-shadow duration-100 focus:bg-page",
        className,
      )}
      {...props}
    />
  );
}
