"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

/**
 * Lemon Squeezy sends the "they paid" message a moment after the buyer lands
 * back here. Rather than asking them to refresh, look again every few
 * seconds until the plan shows up — then stop.
 */
export function WaitForPlan() {
  const router = useRouter();

  React.useEffect(() => {
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      router.refresh();
      if (tries >= 10) window.clearInterval(timer);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [router]);

  return null;
}
