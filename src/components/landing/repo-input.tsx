"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseRepoInput } from "@/lib/github";

const EXAMPLES = [
  "tiangolo/full-stack-fastapi-template",
  "vercel/ai-chatbot",
];

export function RepoInput() {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  function go(raw: string) {
    try {
      const { owner, repo } = parseRepoInput(raw);
      setError(null);
      setBusy(true);
      router.push(`/r/${owner}/${repo}`);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "That doesn't look like a repository link",
      );
    }
  }

  return (
    <div className="mx-auto max-w-[520px]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) go(value);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          id="repo"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          // Belt and braces: some browsers skip implicit submission here, and
          // pressing Enter is what most people will actually do.
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (value.trim()) go(value);
            }
          }}
          placeholder="github.com/you/your-repo"
          aria-label="Repository address"
          className="h-11 flex-1 rounded-md bg-page px-3.5 font-mono text-[13.5px] text-primary shadow-[inset_0_0_0_1px_var(--border)] placeholder:text-tertiary"
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={!value.trim() || busy}
          className="h-11 shrink-0 px-4 text-[15px]"
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Opening
            </>
          ) : (
            <>
              Map it <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      {error ? (
        <p className="mt-2.5 text-[13px] text-c-red">{error}</p>
      ) : (
        <p className="mt-3 text-[13px] text-tertiary">
          No account needed for a public repository. Or try{" "}
          {EXAMPLES.map((e, i) => (
            <React.Fragment key={e}>
              {i > 0 && " · "}
              <button
                type="button"
                onClick={() => go(e)}
                className="font-mono text-[12.5px] text-accent-text hover:underline"
              >
                {e.split("/")[1]}
              </button>
            </React.Fragment>
          ))}
        </p>
      )}
    </div>
  );
}
