"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "What should we call you?" — one field, saved as you mean it. Used for the
 * first-visit prompt and the account page alike.
 */
export function NameForm({
  initial,
  submitLabel = "Save",
  secondary,
  quiet = false,
}: {
  initial: string;
  submitLabel?: string;
  /** Where another button already has the one primary slot on the page. */
  quiet?: boolean;
  /** An extra quiet action, e.g. "Keep my GitHub name". */
  secondary?: { label: string; name: string };
}) {
  const router = useRouter();
  const [value, setValue] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);

  async function save(name: string) {
    setBusy(true);
    setProblem(null);
    setSaved(false);
    const res = await fetch("/api/account/name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res || !res.ok) {
      setProblem(json.hint || json.error || "That didn't save. Try again.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) save(value);
      }}
    >
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          maxLength={60}
          placeholder="Your name"
          aria-label="Your name"
          className="h-control-lg min-w-0 flex-1 rounded-md bg-sunken px-2.5 text-[14px] text-primary shadow-[inset_0_0_0_1px_var(--border)] placeholder:text-tertiary focus:bg-page focus:outline-none"
        />
        <Button
          type="submit"
          variant={quiet ? "secondary" : "primary"}
          size="lg"
          disabled={busy || !value.trim()}
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : saved ? (
            <Check className="size-3.5" />
          ) : null}
          {saved ? "Saved" : submitLabel}
        </Button>
      </div>
      {secondary && (
        <button
          type="button"
          onClick={() => save(secondary.name)}
          disabled={busy}
          className="notion-hover mt-2 px-1.5 py-0.5 text-[12.5px] text-tertiary hover:text-secondary"
        >
          {secondary.label}
        </button>
      )}
      {problem && <p className="mt-2 text-[12.5px] text-c-red">{problem}</p>}
    </form>
  );
}
