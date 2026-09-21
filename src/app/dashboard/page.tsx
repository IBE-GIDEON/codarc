import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { canSignIn, currentUser } from "@/lib/session";
import { entitlement } from "@/lib/accounts";
import { isDbConfigured } from "@/lib/db";
import { teamFor } from "@/lib/teams";
import { DashboardSidebar, DashboardTopBar } from "@/components/dashboard/dashboard-sidebar";
import { OpenRepo } from "@/components/dashboard/open-repo";
import { RecentMaps } from "@/components/dashboard/recent-maps";
import { ReposLoading, TeamRepos, YourRepos } from "@/components/dashboard/github-repos";

export const metadata: Metadata = { title: "Home · Codarc" };
export const dynamic = "force-dynamic";

/**
 * Where a signed-in person starts. The landing page is for meeting Codarc;
 * this is for using it — your projects, one click from their maps.
 */
export default async function Dashboard() {
  const user = await currentUser();
  if (!user) {
    if (canSignIn()) redirect(`/api/auth/github?back=${encodeURIComponent("/dashboard")}`);
    redirect("/?site");
  }

  const [ent, team] = await Promise.all([
    entitlement(user),
    isDbConfigured() ? teamFor(user.id) : Promise.resolve(null),
  ]);

  const planName = ent.plan === "studio" ? "Studio" : ent.plan === "solo" ? "Solo" : null;
  const teamOwner =
    team && team.ownerId !== user.id ? team.members.find((m) => m.role === "owner") : null;
  const planNote = teamOwner
    ? `via ${teamOwner.name || teamOwner.login}'s team`
    : ent.via === "owner-key"
      ? "owner"
      : null;
  const showTeam = ent.plan === "studio" || Boolean(team);
  const firstName = (user.name || user.login).split(" ")[0];

  return (
    <div className="flex h-dvh bg-page">
      <DashboardSidebar user={user} planName={planName} planNote={planNote} showTeam={showTeam} />

      <div className="min-w-0 flex-1 overflow-y-auto">
        <DashboardTopBar user={user} showTeam={showTeam} />
        <div className="px-6 sm:px-12">
          <main className="mx-auto w-full max-w-reading pt-10 pb-24 md:pt-20">
            <h1 className="text-[34px] leading-[1.2] font-bold tracking-[-0.03em] text-primary sm:text-[40px]">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-[16px] leading-[1.5] text-secondary">
              Pick a project to see how it works — or paste any GitHub link.
            </p>

            {!planName && (
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm bg-c-gray-bg px-4 py-3 text-[14px] leading-6 text-primary">
                <span>Looking at maps is free. Changing your app needs a plan.</span>
                <Link
                  href={`/choose?back=${encodeURIComponent("/dashboard")}`}
                  className="font-medium text-accent-text hover:underline"
                >
                  See the plans
                </Link>
              </div>
            )}

            <div className="mt-8">
              <OpenRepo />
            </div>

            <RecentMaps />

            <Suspense fallback={<ReposLoading label="From your GitHub" />}>
              <YourRepos login={user.login} id={user.id} />
            </Suspense>

            {teamOwner && (
              <Suspense fallback={null}>
                <TeamRepos
                  ownerLogin={teamOwner.login}
                  ownerId={teamOwner.githubId}
                  ownerName={teamOwner.name || teamOwner.login}
                />
              </Suspense>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
