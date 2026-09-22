import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { canSignIn, currentUser } from "@/lib/session";
import { displayName, getAccount } from "@/lib/accounts";
import { PageShell } from "@/components/team/page-shell";
import { NameForm } from "@/components/account/name-form";

export const metadata: Metadata = { title: "Your account · Codarc" };
export const dynamic = "force-dynamic";

/** Notion's "My account": who you are to everyone else. */
export default async function AccountPage() {
  const user = await currentUser();
  if (!user) {
    if (canSignIn()) redirect(`/api/auth/github?back=${encodeURIComponent("/account")}`);
    redirect("/?site");
  }

  const account = await getAccount(user.id);
  const name = displayName(account, user);

  return (
    <PageShell>
      <h1 className="text-[34px] leading-[1.15] font-bold tracking-[-0.03em] text-primary">
        Your account
      </h1>

      <div className="mt-8 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={user.avatar} alt="" width={40} height={40} className="size-10 rounded-full" />
        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-primary">{name}</div>
          <div className="truncate text-[12.5px] text-tertiary">Signed in with GitHub as @{user.login}</div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="text-[14px] font-medium text-secondary">Your name</h2>
        <p className="mt-1 mb-3 text-[13.5px] leading-[1.55] text-tertiary">
          What your teammates see — on the team page and next to your cursor on a
          map. Your GitHub username doesn&apos;t change.
        </p>
        <NameForm initial={name} />
      </section>

      <section className="mt-10">
        <h2 className="text-[14px] font-medium text-secondary">Your picture</h2>
        <p className="mt-1 text-[13.5px] leading-[1.55] text-tertiary">
          Comes from GitHub. Change it there and it updates here the next time you
          sign in.
        </p>
      </section>
    </PageShell>
  );
}
