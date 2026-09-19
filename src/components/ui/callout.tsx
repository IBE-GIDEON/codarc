import * as React from "react";
import { cn } from "@/lib/cn";

type Tone = "gray" | "blue" | "green" | "yellow" | "red" | "purple";

// The Notion callout: tinted block, emoji on the left, no border, no icon
// circle, no heading. It is the only "alert" pattern in the system — we do not
// ship a separate Alert/Banner/Toast-looking thing.
const tones: Record<Tone, string> = {
  gray: "bg-c-gray-bg",
  blue: "bg-c-blue-bg",
  green: "bg-c-green-bg",
  yellow: "bg-c-yellow-bg",
  red: "bg-c-red-bg",
  purple: "bg-c-purple-bg",
};

export function Callout({
  icon = "💡",
  tone = "gray",
  className,
  children,
}: {
  icon?: React.ReactNode;
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-sm p-4 text-[14px] leading-6 text-primary",
        tones[tone],
        className,
      )}
    >
      <span className="mt-px shrink-0 text-[16px] leading-6">{icon}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
