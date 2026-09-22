"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Loader2, LogOut, RefreshCw, UserMinus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { XMark } from "@/components/brand-marks";
import type { Member } from "@/lib/teams";

function Avatar({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[rgb(var(--ink)/0.08)] text-[12px] font-medium text-secondary">
        {name.slice(0, 1).toUpperCase()}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={32} height={32} className="size-8 shrink-0 rounded-full" />;
}

export function TeamManager({
  isOwner,
  ownerName,
  members,
  seatsTotal,
  meId,
}: {
  isOwner: boolean;
  ownerName: string;
  members: Member[];
  seatsTotal: number;
  meId: number;
}) {
  const router = useRouter();
  const [invite, setInvite] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [problem, setProblem] = React.useState<{ error: string; hint: string } | null>(null);
  // One row at a time asks "are you sure?" — nobody loses a seat to a stray click.
  const [confirming, setConfirming] = React.useState<{
    id: number;
    action: "remove" | "replace";
  } | null>(null);

  const full = members.length >= seatsTotal;
  const free = Math.max(0, seatsTotal - members.length);

  async function call(path: string, body?: unknown) {
    setProblem(null);
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setProblem({ error: json.error ?? "That didn't work", hint: json.hint ?? "" });
      return null;
    }
    return json;
  }

  async function makeInvite() {
    setBusy("invite");
    const json = await call("/api/team/invite");
    setBusy(null);
    if (json?.url) setInvite(json.url);
  }

  async function remove(id: number) {
    setBusy(`remove:${id}`);
    const json = await call("/api/team/remove", { memberId: id });
    setBusy(null);
    setConfirming(null);
    if (json) router.refresh();
  }

  async function replace(id: number) {
    setBusy(`replace:${id}`);
    const json = await call("/api/team/replace", { memberId: id });
    setBusy(null);
    setConfirming(null);
    if (json?.url) {
      setInvite(json.url);
      router.refresh();
    }
  }

  async function leave() {
    setBusy("leave");
    const json = await call("/api/team/leave");
    setBusy(null);
    if (json) router.refresh();
  }

  async function copy() {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div>
      {/* seats */}
      <div className="flex items-center gap-3 rounded-xl bg-sunken p-4">
        <Users className="size-4 shrink-0 text-tertiary" />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium text-primary">
            {members.length} of {seatsTotal} seats used
          </div>
          <div className="text-[12.5px] text-tertiary">
            {isOwner
              ? "Everyone here uses your Studio plan."
              : `You're on ${ownerName}'s team, using their Studio plan.`}
          </div>
        </div>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: seatsTotal }).map((_, i) => (
            <span
              key={i}
              className="h-2 w-5 rounded-full"
              style={{
                background:
                  i < members.length ? "var(--accent)" : "rgb(var(--ink) / 0.12)",
              }}
            />
          ))}
        </div>
      </div>

      {/* people */}
      <div className="mt-6">
        <div className="mb-2 text-[12px] font-medium text-tertiary">People</div>
        <div className="space-y-px">
          {members.map((m) => {
            const who = m.name || m.login;
            const asking = confirming?.id === m.githubId ? confirming.action : null;
            const working = busy?.endsWith(`:${m.githubId}`);

            return (
              <div key={m.githubId}>
                <div className="reveal-parent notion-hover flex items-center gap-3 px-2 py-2">
                  <Avatar src={m.avatar} name={who} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] text-primary">
                      {who}
                      {m.githubId === meId && <span className="text-tertiary"> · you</span>}
                    </div>
                    <div className="truncate text-[12px] text-tertiary">
                      @{m.login} · {m.role === "owner" ? "Owner" : "Member"}
                    </div>
                  </div>
                  {/* Always on show, not hover-only: an owner looking for
                      "how do I remove someone" shouldn't have to discover it. */}
                  {isOwner && m.role !== "owner" && !asking && (
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => setConfirming({ id: m.githubId, action: "replace" })}
                        disabled={busy !== null}
                        className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-[12.5px] text-tertiary hover:bg-hover hover:text-primary"
                      >
                        <RefreshCw className="size-3.5" /> Replace
                      </button>
                      <button
                        onClick={() => setConfirming({ id: m.githubId, action: "remove" })}
                        disabled={busy !== null}
                        className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-[12.5px] text-tertiary hover:bg-c-red-bg hover:text-c-red"
                      >
                        <UserMinus className="size-3.5" /> Remove
                      </button>
                    </div>
                  )}
                </div>

                {asking && (
                  <div className="mx-2 mb-2 rounded-sm bg-c-red-bg p-3">
                    <p className="text-[13px] leading-[1.5] text-primary">
                      {asking === "replace"
                        ? `Take ${who} off the team and make a new invite link for their seat?`
                        : `Take ${who} off the team?`}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-[1.5] text-secondary">
                      They lose access straight away. The link they joined with
                      only ever worked once, so they can&apos;t use it to come back.
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <Button
                        variant="secondary"
                        size="md"
                        disabled={busy !== null}
                        onClick={() =>
                          asking === "replace" ? replace(m.githubId) : remove(m.githubId)
                        }
                        className="text-c-red"
                      >
                        {working ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : asking === "replace" ? (
                          <RefreshCw className="size-3.5" />
                        ) : (
                          <UserMinus className="size-3.5" />
                        )}
                        {asking === "replace" ? "Remove and invite someone new" : `Remove ${who}`}
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        disabled={busy !== null}
                        onClick={() => setConfirming(null)}
                      >
                        Keep them
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {problem && (
        <div className="mt-4 rounded-sm bg-c-yellow-bg p-3">
          <div className="text-[13px] font-medium text-primary">{problem.error}</div>
          {problem.hint && (
            <p className="mt-0.5 text-[12.5px] leading-[1.5] text-secondary">{problem.hint}</p>
          )}
        </div>
      )}

      {/* invite, or the way past five */}
      {isOwner && (
        <div className="mt-8">
          {invite ? (
            <div>
              <div className="mb-2 text-[12px] font-medium text-tertiary">Invite link</div>
              <div className="flex items-center gap-2 rounded-md bg-sunken px-3 py-2 shadow-[inset_0_0_0_1px_var(--border)]">
                <Link2 className="size-3.5 shrink-0 text-tertiary" />
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-secondary">
                  {invite}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="primary" size="lg" onClick={copy}>
                  {copied ? (
                    <>
                      <Check className="size-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" /> Copy link
                    </>
                  )}
                </Button>
                <Button variant="secondary" size="lg" onClick={() => setInvite(null)}>
                  Done
                </Button>
              </div>
              <p className="mt-3 text-[12.5px] leading-[1.5] text-tertiary">
                Works once, for one person, for seven days. They make a Codarc
                account with their GitHub, and they&apos;re in.
              </p>
            </div>
          ) : full ? (
            <div className="rounded-xl bg-sunken p-5">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-primary">
                All {seatsTotal} seats are taken
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-secondary">
                To swap someone out, press Replace next to their name. For
                a bigger team, send us a message — tell us how many people and
                how many projects.
              </p>
              <a href="https://x.com/C0darc" target="_blank" rel="noreferrer" className="mt-4 inline-block">
                <Button variant="secondary" size="lg">
                  <XMark className="size-3.5" /> Message us on X
                </Button>
              </a>
            </div>
          ) : (
            <div>
              <Button variant="primary" size="lg" onClick={makeInvite} disabled={busy !== null}>
                {busy === "invite" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Link2 className="size-3.5" />
                )}
                Invite someone
              </Button>
              <p className="mt-2 text-[12.5px] text-tertiary">
                {free} {free === 1 ? "seat" : "seats"} left.
              </p>
            </div>
          )}
        </div>
      )}

      {!isOwner && (
        <div className="mt-8">
          <Button variant="secondary" size="lg" onClick={leave} disabled={busy !== null}>
            {busy === "leave" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <LogOut className="size-3.5" />
            )}
            Leave this team
          </Button>
        </div>
      )}
    </div>
  );
}
