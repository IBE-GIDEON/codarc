"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function JoinButton({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [problem, setProblem] = React.useState<{ error: string; hint: string } | null>(null);

  async function join() {
    setBusy(true);
    setProblem(null);
    const res = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setProblem({ error: json.error ?? "That didn't work", hint: json.hint ?? "" });
      return;
    }
    // Straight to the projects they now share.
    router.push("/dashboard");
  }

  return (
    <div>
      <Button variant="primary" size="lg" className="h-10 px-5" onClick={join} disabled={busy}>
        {busy && <Loader2 className="size-3.5 animate-spin" />}
        Join the team
      </Button>
      {problem && (
        <div className="mt-4 rounded-sm bg-c-yellow-bg p-3">
          <div className="text-[13px] font-medium text-primary">{problem.error}</div>
          {problem.hint && (
            <p className="mt-0.5 text-[12.5px] leading-[1.5] text-secondary">{problem.hint}</p>
          )}
        </div>
      )}
    </div>
  );
}
