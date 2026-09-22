import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { canSignIn, currentUser } from "@/lib/session";
import { displayName, entitlement, getAccount } from "@/lib/accounts";
import { NameForm } from "@/components/account/name-form";
import { WaitForPlan } from "@/components/dashboard/wait-for-plan";
import { SignInAgain } from "@/components/dashboard/sign-in-again";
import { isDbConfigured } from "@/lib/db";
import { teamFor } from "@/lib/teams";
import { DashboardSidebar, DashboardTopBar } from "@/components/dashboard/dashboard-sidebar";
import { OpenRepo } from "@/components/dashboard/open-repo";
import { RecentMaps } from "@/components/dashboard/recent-maps";
import {
  OrgRepos,
  ReposLoading,
  TeamRepos,
  YourRepos,
} from "@/components/dashboard/github-repos";

export const metadata: Metadata = { title: "Home · Codarc" };
export const dynamic = "force-dynamic";

/**
 * Where a signed-in person starts. The landing page is for meeting Codarc;
 * this is for using it — your projects, one click from their maps.
 */
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; back?: string; billing?: string; signin?: string }>;
}) {
  const { paid, back, billing, signin } = await searchParams;
  const user = await currentUser();
  if (!user) {
    // A sign-in that just failed gets a page and a button, not another
    // automatic trip to GitHub — that could bounce back and forth forever.
    if (signin && signin !== "ok" && canSignIn()) return <SignInAgain reason={signin} />;
    if (canSignIn()) redirect(`/api/auth/github?back=${encodeURIComponent("/dashboard")}`);
    redirect("/?site");
  }
  const [ent, team, account] = await Promise.all([
    entitlement(user),
    isDbConfigured() ? teamFor(user.id) : Promise.resolve(null),
    getAccount(user.id),
  ]);
  const paysOwn = ent.via === "own";
  const cardFailed = paysOwn && account?.plan_status === "past_due";
  const endsOn =
    paysOwn && account?.plan_status === "cancelled" && account.plan_ends_at
      ? new Date(account.plan_ends_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
        })
      : null;
  const returnTo = back && back.startsWith("/") && !back.startsWith("//") && back !== "/dashboard" ? back : null;

  const planName = ent.plan === "studio" ? "Studio" : ent.plan === "solo" ? "Solo" : null;
  const teamOwner =
    team && team.ownerId !== user.id ? team.members.find((m) => m.role === "owner") : null;
  const planNote = teamOwner
    ? `via ${teamOwner.name || teamOwner.login}'s team`
    : ent.via === "owner-key"
      ? "owner"
      : null;
  const showTeam = ent.plan === "studio" || Boolean(team);
  const name = displayName(account, user);
  const firstName = name.split(" ")[0];
  // Asked once: the column exists (so `undefined` means "not added yet") and
  // they haven't chosen. Choosing — even "keep my GitHub name" — ends it.
  const askName = Boolean(account && "display_name" in account && account.display_name === null);
  const shown = { ...user, name };

  return (
    <div className="flex h-dvh bg-page">
      <DashboardSidebar
        user={shown}
        planName={planName}
        planNote={planNote}
        showTeam={showTeam}
        paysOwn={paysOwn}
      />

      <div className="min-w-0 flex-1 overflow-y-auto">
        <DashboardTopBar user={shown} showTeam={showTeam} />
        <div className="px-6 sm:px-12">
          <main className="mx-auto w-full max-w-reading pt-10 pb-24 md:pt-20">
            <h1 className="text-[34px] leading-[1.2] font-bold tracking-[-0.03em] text-primary sm:text-[40px]">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-[16px] leading-[1.5] text-secondary">
              Pick a project to see how it works — or paste any GitHub link.
            </p>

            {askName && (
              <div className="mt-6 rounded-sm bg-c-blue-bg p-4">
                <div className="text-[14px] font-medium text-primary">
                  What should your teammates call you?
                </div>
                <p className="mt-0.5 mb-3 text-[13px] leading-[1.5] text-secondary">
                  Shown on your team and next to your cursor on a map. Change it any
                  time in Your account.
                </p>
                <NameForm
                  quiet
                  initial={user.name ?? ""}
                  secondary={{
                    label: `Keep "${user.name || user.login}"`,
                    name: user.name || user.login,
                  }}
                />
              </div>
            )}

            {paid && planName && (
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm bg-c-green-bg px-4 py-3 text-[14px] leading-6 text-primary">
                <span>
                  🎉 You&apos;re on {planName}. Thank you — everything is switched on.
                </span>
                {returnTo && (
                  <Link href={returnTo} className="font-medium text-accent-text hover:underline">
                    Back to where you were
                  </Link>
                )}
              </div>
            )}

            {paid && !planName && (
              <div className="mt-6 rounded-sm bg-c-blue-bg px-4 py-3 text-[14px] leading-6 text-primary">
                Payment received. Your plan switches on in a few seconds — this
                page will update by itself.
                <WaitForPlan />
              </div>
            )}

            {cardFailed && (
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm bg-c-yellow-bg px-4 py-3 text-[14px] leading-6 text-primary">
                <span>Your last payment didn&apos;t go through. Everything still works while we try again.</span>
                <a href="/api/billing/portal" className="font-medium text-accent-text hover:underline">
                  Update your card
                </a>
              </div>
            )}

            {endsOn && (
              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm bg-c-gray-bg px-4 py-3 text-[14px] leading-6 text-primary">
                <span>Your plan is cancelled and ends on {endsOn}.</span>
                <a href="/api/billing/portal" className="font-medium text-accent-text hover:underline">
                  Keep it
                </a>
              </div>
            )}

            {billing === "unavailable" && (
              <div className="mt-6 rounded-sm bg-c-yellow-bg px-4 py-3 text-[14px] leading-6 text-primary">
                The billing page didn&apos;t open. Nothing has changed — try again in a moment.
              </div>
            )}

            {!planName && !paid && (
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

            {(user.orgs ?? []).map((org) => (
              <Suspense key={org.id} fallback={<ReposLoading label={`From ${org.login} on GitHub`} />}>
                <OrgRepos org={org} user={{ id: user.id, login: user.login }} />
              </Suspense>
            ))}

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
