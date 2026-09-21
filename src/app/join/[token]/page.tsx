import type { Metadata } from "next";
import Link from "next/link";
import { currentUser, canSignIn } from "@/lib/session";
import { previewInvite } from "@/lib/teams";
import { PageShell } from "@/components/team/page-shell";
import { JoinButton } from "@/components/team/join-button";
import { GithubMark } from "@/components/brand-marks";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Join a team · Codarc" };
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

export default async function JoinPage({ params }: Params) {
  const { token } = await params;
  const user = await currentUser();
  const home = user ? "/dashboard" : "/";

  const preview = await previewInvite(token);

  if (!preview.ok) {
    return (
      <PageShell home={home}>
        <h1 className="text-[28px] leading-[1.2] font-bold tracking-[-0.025em] text-primary">
          {preview.error}
        </h1>
        <p className="mt-3 text-[15px] leading-[1.6] text-secondary">{preview.hint}</p>
        <Link href={home} className="mt-6 inline-block">
          <Button variant="secondary" size="lg">
            Go to Codarc
          </Button>
        </Link>
      </PageShell>
    );
  }

  const { ownerName, ownerAvatar, seatsUsed, seatsTotal } = preview.value;
  const here = `/join/${token}`;

  return (
    <PageShell home={home}>
      {ownerAvatar && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={ownerAvatar} alt="" width={48} height={48} className="size-12 rounded-full" />
      )}
      <h1 className="mt-5 text-[32px] leading-[1.15] font-bold tracking-[-0.03em] text-primary">
        {ownerName} invited you to their team
      </h1>
      <p className="mt-3 text-[16px] leading-[1.6] text-secondary">
        You&apos;ll see the same maps, read the same handover packs, and use
        their Studio plan. Nothing to pay.
      </p>
      <p className="mt-2 mb-7 text-[13px] text-tertiary">
        {seatsUsed} of {seatsTotal} seats taken.
      </p>

      {user ? (
        <JoinButton token={token} />
      ) : canSignIn() ? (
        // Everyone on a team has their own account — joining starts there.
        <div>
          <a href={`/api/auth/github?back=${encodeURIComponent(here)}`}>
            <Button variant="primary" size="lg" className="h-10 px-5">
              <GithubMark className="size-3.5" /> Sign up with GitHub to join
            </Button>
          </a>
          <p className="mt-3 text-[12.5px] leading-[1.5] text-tertiary">
            Takes a few seconds. Already have a Codarc account? The same button
            signs you in.
          </p>
        </div>
      ) : (
        <p className="rounded-sm bg-c-gray-bg p-4 text-[14px] leading-[1.6] text-secondary">
          Accounts aren&apos;t switched on here yet, so this invite can&apos;t be
          used right now.
        </p>
      )}
    </PageShell>
  );
}
