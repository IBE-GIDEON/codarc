"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { GithubMark } from "@/components/brand-marks";
import { Button } from "@/components/ui/button";

type Caps = {
  user: { login: string; name: string | null; avatar: string } | null;
  canSignIn: boolean;
};

/** Forwards `?as=customer` so the owner can preview their own paywall. */
function capabilitiesUrl() {
  if (typeof window === "undefined") return "/api/capabilities";
  const as = new URLSearchParams(window.location.search).get("as");
  return as ? `/api/capabilities?as=${encodeURIComponent(as)}` : "/api/capabilities";
}

/** Sits at the bottom of the sidebar: who you are, or a way to become someone. */
export function Account() {
  const [caps, setCaps] = React.useState<Caps | null>(null);

  React.useEffect(() => {
    let live = true;
    fetch(capabilitiesUrl())
      .then((r) => r.json())
      .then((d) => {
        if (live) setCaps(d);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const here =
    typeof window === "undefined"
      ? "/"
      : window.location.pathname + window.location.search;

  // Nothing until we know — a sign-in button that vanishes is worse than a
  // beat of silence.
  if (!caps) return null;

  if (caps.user) {
    return (
      <div className="reveal-parent flex items-center gap-2 px-2 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={caps.user.avatar}
          alt=""
          width={20}
          height={20}
          className="size-5 shrink-0 rounded-full"
        />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-secondary">
          {caps.user.name || caps.user.login}
        </span>
        <a
          href={`/api/auth/signout?back=${encodeURIComponent(here)}`}
          className="reveal grid size-6 shrink-0 place-items-center rounded-sm text-tertiary hover:bg-hover"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="size-3.5" />
        </a>
      </div>
    );
  }

  if (!caps.canSignIn) return null;

  return (
    <div className="px-2 py-2">
      <a href={`/api/auth/github?back=${encodeURIComponent(here)}`}>
        <Button variant="secondary" size="md" className="w-full">
          <GithubMark className="size-3.5" /> Sign in with GitHub
        </Button>
      </a>
    </div>
  );
}
