"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/button";

// The `dark` class on <html> is the source of truth (set pre-paint by
// ThemeScript), so we subscribe to it rather than mirroring it into state.
const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => mo.disconnect();
};

const getSnapshot = () => document.documentElement.classList.contains("dark");

export function ThemeToggle({ className }: { className?: string }) {
  const dark = React.useSyncExternalStore(subscribe, getSnapshot, () => false);

  function toggle() {
    const next = !getSnapshot();
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("codarc-theme", next ? "dark" : "light");
    } catch {}
  }

  return (
    <IconButton
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className={className}
    >
      {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </IconButton>
  );
}
