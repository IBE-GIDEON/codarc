"use client";

import * as React from "react";

/**
 * Whether the map's sidebar is showing. Kept in this browser, so the canvas
 * opens the way you left it — and read through an external store so the
 * server's first render (open) never disagrees with what's on screen.
 */

const KEY = "codarc-sidebar";
const CHANGED = "codarc-sidebar-changed";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

function getSnapshot(): boolean {
  try {
    return localStorage.getItem(KEY) !== "hidden";
  } catch {
    return true;
  }
}

export function setSidebarOpen(open: boolean) {
  try {
    localStorage.setItem(KEY, open ? "shown" : "hidden");
  } catch {}
  window.dispatchEvent(new Event(CHANGED));
}

export function useSidebarOpen(): boolean {
  return React.useSyncExternalStore(subscribe, getSnapshot, () => true);
}
