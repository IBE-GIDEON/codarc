import { PageShell } from "@/components/team/page-shell";
import { GithubMark } from "@/components/brand-marks";
import { Button } from "@/components/ui/button";

/**
 * Shown when a trip to GitHub came back without a sign-in — most often
 * because someone made their GitHub account on the way. The second try
 * usually goes straight through, since they're signed in to GitHub by then.
 */
export function SignInAgain({ reason }: { reason: string }) {
  const why =
    reason === "expired"
      ? "That took a little while, so the sign-in link timed out. Nothing is wrong — it's safe to try again."
      : reason === "unavailable"
        ? "Signing in isn't switched on here right now. Try again in a little while."
        : "GitHub didn't send the sign-in back to us. It's safe to try again.";

  return (
    <PageShell home="/?site">
      <h1 className="text-[32px] leading-[1.15] font-bold tracking-[-0.03em] text-primary">
        Let&apos;s finish signing you in
      </h1>
      <p className="mt-3 text-[16px] leading-[1.6] text-secondary">{why}</p>
      <p className="mt-2 mb-7 text-[14px] leading-[1.6] text-tertiary">
        Just made your GitHub account? You&apos;re signed in to GitHub now, so this
        time it should go straight through.
      </p>
      <a href={`/api/auth/github?back=${encodeURIComponent("/dashboard")}`}>
        <Button variant="primary" size="lg" className="h-10 px-5">
          <GithubMark className="size-3.5" /> Continue with GitHub
        </Button>
      </a>
    </PageShell>
  );
}
