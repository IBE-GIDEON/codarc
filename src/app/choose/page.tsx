import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { currentUser, canSignIn } from "@/lib/session";
import { Wordmark } from "@/components/logo";
import { PlanCards } from "@/components/billing/plan-cards";

export const metadata: Metadata = {
  title: "Choose a plan · Codarc",
};

export const dynamic = "force-dynamic";

export default async function ChoosePlan({
  searchParams,
}: {
  searchParams: Promise<{ back?: string }>;
}) {
  const { back } = await searchParams;
  const user = await currentUser();

  // You can't pick a plan before we know who you are.
  if (!user && canSignIn()) {
    const target = `/choose${back ? `?back=${encodeURIComponent(back)}` : ""}`;
    redirect(`/api/auth/github?back=${encodeURIComponent(target)}`);
  }

  const returnTo = back && back.startsWith("/") && !back.startsWith("//") ? back : "/";

  return (
    <div className="min-h-dvh bg-page">
      <header className="flex h-16 items-center px-6">
        <Link href="/" aria-label="Codarc home">
          <Wordmark size="md" />
        </Link>
        <Link
          href={returnTo}
          className="notion-hover ml-auto flex items-center gap-1.5 px-2 py-1 text-[13.5px] text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" /> Back
        </Link>
      </header>

      <main className="mx-auto w-full max-w-[860px] px-6 pt-10 pb-24">
        <div className="mx-auto max-w-[560px] text-center">
          <h1 className="text-[34px] leading-[1.12] font-bold tracking-[-0.03em] text-primary md:text-[40px]">
            {user ? `Nearly there, ${user.name?.split(" ")[0] ?? user.login}.` : "Pick a plan."}
          </h1>
          <p className="mx-auto mt-3 max-w-[46ch] text-[16px] leading-[1.6] text-secondary">
            Codarc reads real code and writes real changes, so it costs real
            money to run. There&apos;s no free tier and there never will be.
          </p>
        </div>

        <div className="mt-10">
          <PlanCards returnTo={returnTo} />
        </div>

        <p className="mt-6 text-center text-[13px] text-tertiary">
          Thirty days, money back, no conversation required.
        </p>
      </main>
    </div>
  );
}
