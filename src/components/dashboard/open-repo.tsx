"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseRepoInput } from "@/lib/github";

/** Paste any GitHub link and go. The quiet sibling of the landing-page box. */
export function OpenRepo() {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  function go() {
    if (!value.trim()) return;
    try {
      const { owner, repo } = parseRepoInput(value);
      setError(null);
      setBusy(true);
      router.push(`/r/${owner}/${repo}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That doesn't look like a GitHub link");
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="flex gap-2"
      >
        <label className="flex h-control-lg min-w-0 flex-1 items-center gap-2 rounded-md bg-sunken px-2.5 shadow-[inset_0_0_0_1px_var(--border)] focus-within:bg-page">
          <Link2 className="size-3.5 shrink-0 text-tertiary" />
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                go();
              }
            }}
            placeholder="Paste a GitHub link, like github.com/you/your-app"
            aria-label="GitHub link"
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-primary placeholder:text-tertiary focus:outline-none"
          />
        </label>
        <Button type="submit" variant="secondary" size="lg" disabled={!value.trim() || busy}>
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
          Map it
        </Button>
      </form>
      {error && <p className="mt-2 text-[12.5px] text-c-red">{error}</p>}
    </div>
  );
}
