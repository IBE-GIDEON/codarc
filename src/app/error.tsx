"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import Link from "next/link";
import { Wordmark } from "@/components/logo";
import { Button } from "@/components/ui/button";

/**
 * When something breaks mid-page, people get a calm sentence and a way
 * forward — never a stack trace, never a blank screen.
 */
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-dvh place-items-center bg-page px-6">
      <div className="w-[min(440px,100%)] rounded-xl bg-raised p-6 shadow-popover">
        <Wordmark size="sm" />
        <h1 className="mt-5 text-[19px] font-semibold tracking-[-0.015em] text-primary">
          Something went wrong on this page
        </h1>
        <p className="mt-2 text-[14px] leading-[1.6] text-secondary">
          That&apos;s on us, not you, and nothing you were working on has been
          changed. Trying again usually fixes it.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="primary" size="lg" onClick={() => retry()}>
            <RotateCcw className="size-3.5" /> Try again
          </Button>
          <Link href="/">
            <Button variant="secondary" size="lg">
              Back to your projects
            </Button>
          </Link>
        </div>
        {error.digest && (
          <p className="mt-4 font-mono text-[11px] text-ghost">Reference: {error.digest}</p>
        )}
      </div>
    </div>
  );
}
