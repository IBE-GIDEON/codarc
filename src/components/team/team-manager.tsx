"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Link2, Loader2, LogOut, UserMinus, Users } from "lucide-react";
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
    if (json) router.refresh();
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
          {members.map((m) => (
            <div key={m.githubId} className="reveal-parent notion-hover flex items-center gap-3 px-2 py-2">
              <Avatar src={m.avatar} name={m.name || m.login} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] text-primary">
                  {m.name || m.login}
                  {m.githubId === meId && <span className="text-tertiary"> · you</span>}
                </div>
                <div className="truncate text-[12px] text-tertiary">
                  @{m.login} · {m.role === "owner" ? "Owner" : "Member"}
                </div>
              </div>
              {isOwner && m.role !== "owner" && (
                <button
                  onClick={() => remove(m.githubId)}
                  disabled={busy !== null}
                  className="reveal flex items-center gap-1.5 rounded-sm px-2 py-1 text-[12.5px] text-c-red hover:bg-c-red-bg"
                >
                  {busy === `remove:${m.githubId}` ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <UserMinus className="size-3.5" />
                  )}
                  Remove
                </button>
              )}
            </div>
          ))}
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
          {full ? (
            <div className="rounded-xl bg-sunken p-5">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-primary">
                Need more than {seatsTotal} people?
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-secondary">
                Bigger teams get a plan built around them. Send us a message and
                tell us how many people and how many projects.
              </p>
              <a href="https://x.com/C0darc" target="_blank" rel="noreferrer" className="mt-4 inline-block">
                <Button variant="primary" size="lg">
                  <XMark className="size-3.5" /> Message us on X
                </Button>
              </a>
            </div>
          ) : invite ? (
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
                Works once, for one person, for seven days. They sign in with
                GitHub and they&apos;re in.
              </p>
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
