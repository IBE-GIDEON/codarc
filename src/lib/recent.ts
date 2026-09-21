"use client";

import * as React from "react";

/**
 * Maps you've opened lately, kept in this browser. It's a convenience — a
 * way back to where you were — so losing it (private window, cleared data)
 * costs nothing.
 */

export type RecentMap = {
  owner: string;
  repo: string;
  at: number;
  overview?: string;
  isPrivate?: boolean;
};

const KEY = "codarc-recent";
const LIMIT = 12;
const CHANGED = "codarc-recent-changed";
const EMPTY: RecentMap[] = [];

let cachedRaw: string | null = null;
let cached: RecentMap[] = EMPTY;

function read(): RecentMap[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  // Same text, same array — useSyncExternalStore needs a stable answer.
  if (raw === cachedRaw) return cached;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    cached = Array.isArray(parsed) ? (parsed as RecentMap[]) : EMPTY;
  } catch {
    cached = EMPTY;
  }
  return cached;
}

function write(list: RecentMap[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)));
    window.dispatchEvent(new Event(CHANGED));
  } catch {}
}

const same = (a: { owner: string; repo: string }, b: { owner: string; repo: string }) =>
  a.owner.toLowerCase() === b.owner.toLowerCase() && a.repo.toLowerCase() === b.repo.toLowerCase();

export function rememberMap(entry: Omit<RecentMap, "at">) {
  write([{ ...entry, at: Date.now() }, ...read().filter((r) => !same(r, entry))]);
}

export function forgetMap(entry: { owner: string; repo: string }) {
  write(read().filter((r) => !same(r, entry)));
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGED, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGED, onChange);
  };
}

export function useRecentMaps(): RecentMap[] {
  return React.useSyncExternalStore(subscribe, read, () => EMPTY);
}
