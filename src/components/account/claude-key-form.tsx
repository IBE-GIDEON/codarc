"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Your Claude key" — the thing that makes changing code possible without
 * Codarc paying for every click. Typed once, checked with Anthropic, then
 * never shown again.
 */
export function ClaudeKeyForm({ current }: { current: string | null }) {
  const router = useRouter();
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState<"save" | "remove" | null>(null);
  const [problem, setProblem] = React.useState<{ error: string; hint: string } | null>(null);
  const [saved, setSaved] = React.useState(false);

  async function save() {
    setBusy("save");
    setProblem(null);
    setSaved(false);
    const res = await fetch("/api/account/claude-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: value.trim() }),
    }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    if (!res || !res.ok) {
      setProblem({ error: json.error ?? "That didn't work", hint: json.hint ?? "" });
      return;
    }
    setValue("");
    setSaved(true);
    router.refresh();
  }

  async function remove() {
    setBusy("remove");
    setProblem(null);
    await fetch("/api/account/claude-key", { method: "DELETE" }).catch(() => null);
    setBusy(null);
    router.refresh();
  }

  if (current) {
    return (
      <div>
        <div className="flex items-center gap-3 rounded-sm bg-c-green-bg p-3">
          <Check className="size-4 shrink-0 text-c-green" />
          <div className="min-w-0 flex-1">
            <div className="text-[13.5px] font-medium text-primary">
              Your key is connected
            </div>
            <div className="truncate font-mono text-[12px] text-secondary">{current}</div>
          </div>
          <Button variant="secondary" size="md" onClick={remove} disabled={busy !== null}>
            {busy === "remove" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Remove
          </Button>
        </div>
        <p className="mt-2 text-[12.5px] leading-[1.5] text-tertiary">
          Changes you make are billed to your own Anthropic account. Roughly 10
          to 30 US cents each.
        </p>
      </div>
    );
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) save();
        }}
        className="flex gap-2"
      >
        <input
          type="password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setProblem(null);
          }}
          placeholder="sk-ant-..."
          aria-label="Your Claude key"
          autoComplete="off"
          spellCheck={false}
          className="h-control-lg min-w-0 flex-1 rounded-md bg-sunken px-2.5 font-mono text-[13px] text-primary shadow-[inset_0_0_0_1px_var(--border)] placeholder:text-tertiary focus:bg-page focus:outline-none"
        />
        <Button type="submit" variant="primary" size="lg" disabled={busy !== null || !value.trim()}>
          {busy === "save" ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {saved ? "Saved" : "Connect"}
        </Button>
      </form>

      {problem ? (
        <div className="mt-2 rounded-sm bg-c-red-bg p-3">
          <div className="text-[13px] font-medium text-primary">{problem.error}</div>
          {problem.hint && (
            <p className="mt-0.5 text-[12.5px] leading-[1.5] text-secondary">{problem.hint}</p>
          )}
        </div>
      ) : (
        <ol className="mt-3 space-y-1 text-[12.5px] leading-[1.6] text-tertiary">
          <li>
            1. Open{" "}
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noreferrer"
              className="text-accent-text hover:underline"
            >
              console.anthropic.com <ExternalLink className="inline size-3" />
            </a>{" "}
            and sign in.
          </li>
          <li>2. Add a payment method, then press Create key.</li>
          <li>3. Copy it and paste it above. It&apos;s only shown once.</li>
        </ol>
      )}
    </div>
  );
}
