import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, canSignIn } from "@/lib/session";
import { entitlement, hasLiveStudio } from "@/lib/accounts";
import { isDbConfigured } from "@/lib/db";
import { teamFor } from "@/lib/teams";
import { MAX_SEATS } from "@/lib/plans";
import { PageShell } from "@/components/team/page-shell";
import { TeamManager } from "@/components/team/team-manager";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Your team · Codarc" };
export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const user = await currentUser();
  if (!user) {
    if (canSignIn()) redirect(`/api/auth/github?back=${encodeURIComponent("/team")}`);
    redirect("/");
  }

  if (!isDbConfigured()) {
    return (
      <PageShell>
        <h1 className="text-[34px] leading-[1.15] font-bold tracking-[-0.03em] text-primary">
          Your team
        </h1>
        <p className="mt-4 rounded-sm bg-c-gray-bg p-4 text-[14px] leading-[1.6] text-secondary">
          Teams need somewhere to remember who&apos;s on them, and the database
          isn&apos;t connected yet.
        </p>
      </PageShell>
    );
  }

  const ent = await entitlement(user);
  const team = await teamFor(user.id);

  // Neither paying for Studio nor on anyone's team.
  if (!team && ent.plan !== "studio") {
    return (
      <PageShell>
        <h1 className="text-[34px] leading-[1.15] font-bold tracking-[-0.03em] text-primary">
          Bring your people in
        </h1>
        <p className="mt-3 text-[16px] leading-[1.6] text-secondary">
          Studio lets up to {MAX_SEATS} people share the same maps — a
          co-founder, a contractor, the developer you&apos;re about to hire.
          Everyone signs in with their own GitHub, and everyone uses your plan.
        </p>
        <Link href={`/choose?back=${encodeURIComponent("/team")}`} className="mt-6 inline-block">
          <Button variant="primary" size="lg" className="h-10 px-4">
            See Studio
          </Button>
        </Link>
      </PageShell>
    );
  }

  const isOwner = !team || team.ownerId === user.id;
  const members = team?.members ?? [
    {
      githubId: user.id,
      login: user.login,
      name: user.name,
      avatar: user.avatar,
      role: "owner" as const,
      joinedAt: new Date().toISOString(),
    },
  ];
  const owner = members.find((m) => m.role === "owner");
  // Teammates ride on the owner's Studio in the database. If that isn't
  // live, the team is paused: nobody new joins and nobody gets Studio from it.
  const active = await hasLiveStudio(team ? team.ownerId : user.id);

  return (
    <PageShell>
      <h1 className="text-[34px] leading-[1.15] font-bold tracking-[-0.03em] text-primary">
        Your team
      </h1>
      <p className="mt-2 mb-8 text-[15px] leading-[1.6] text-secondary">
        {isOwner
          ? `Up to ${MAX_SEATS} people, you included. Everyone sees the same maps and uses your plan.`
          : "You're here because someone invited you. Your access comes from their plan."}
      </p>
      <TeamManager
        isOwner={isOwner}
        ownerName={owner?.name || owner?.login || "the owner"}
        members={members}
        seatsTotal={MAX_SEATS}
        meId={user.id}
        active={active}
        ownerKeyOnly={isOwner && !active && ent.via === "owner-key"}
      />
    </PageShell>
  );
}
