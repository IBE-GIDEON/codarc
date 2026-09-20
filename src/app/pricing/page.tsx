import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, Minus } from "lucide-react";
import { PLANS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/logo";
import { SiteFooter } from "@/components/landing/site-footer";
import { StackWall } from "@/components/landing/stack-wall";
import { Container } from "@/components/landing/shared";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Pricing · Codarc",
  description: "No free tier. On purpose. Solo $29, Studio $79.",
};

/** null = not included · true = included · string = the specific limit. */
type Value = true | string | null;

const COMPARISON: {
  group: string;
  rows: { label: string; note?: string; solo: Value; studio: Value }[];
}[] = [
  {
    group: "Seeing your app",
    rows: [
      {
        label: "Projects",
        note: "Repositories Codarc can read",
        solo: "3",
        studio: "Unlimited",
      },
      {
        label: "Redraw the map",
        note: "As your code changes",
        solo: "Unlimited",
        studio: "Unlimited",
      },
      { label: "Your arrangement is remembered", solo: true, studio: true },
      { label: "Search across everything", solo: true, studio: true },
      { label: "Faster reading of big projects", solo: null, studio: true },
    ],
  },
  {
    group: "Changing your app",
    rows: [
      {
        label: "Changes a month",
        note: "One request, one proposal",
        solo: "100",
        studio: "Unlimited",
      },
      { label: "See the change before it happens", solo: true, studio: true },
      {
        label: "Arrives as a pull request",
        note: "Never touches your live app",
        solo: true,
        studio: true,
      },
      { label: "Python and JavaScript apps", solo: true, studio: true },
    ],
  },
  {
    group: "Working with other people",
    rows: [
      { label: "People on the account", solo: "1", studio: "5" },
      { label: "Shared maps", solo: null, studio: true },
      {
        label: "Exports for handing work to a developer",
        solo: null,
        studio: true,
      },
      { label: "Private deployment", note: "On request", solo: null, studio: true },
    ],
  },
];

const FAQ = [
  {
    q: "Why is there no free plan?",
    a: "Free plans mean queues, limits, and your app waiting behind somebody else's free ride. Codarc reads real code and writes real changes, which costs real money every single time. Charging from day one is how it stays fast for the people actually using it.",
  },
  {
    q: "What counts as one change?",
    a: "One thing you asked for, and the proposal that comes back. If you don't like it and ask again differently, that's a second one. Looking at your map, searching it, and reading any part of it are unlimited on both plans.",
  },
  {
    q: "Do I need to know how to code?",
    a: "No. That's the whole point. Everything on screen is written in ordinary words, and a change is described to you in plain English before anything happens. You do need to own the app, or have permission to change it.",
  },
  {
    q: "Can it break my app?",
    a: "Codarc never writes to your live app. Every change arrives on a separate copy and nothing reaches your customers until you approve it. You should still read what it wrote, or have someone read it for you.",
  },
  {
    q: "What happens if I run out of changes?",
    a: "Nothing breaks. We tell you, and you either wait for the month to roll over or move up to Studio. Your maps keep working either way.",
  },
  {
    q: "Which plan should I pick?",
    a: "Solo if you built it alone and it's one project. Studio the moment somebody else needs to understand it too — a co-founder, a contractor, or the developer you're about to hire.",
  },
  {
    q: "Can I get my money back?",
    a: "Yes. Ask within thirty days of your first payment and you get a full refund, no conversation required.",
  },
  {
    q: "Is my code used to train anything?",
    a: "No. It's read to answer the question you asked, and then it's done. Never retained, never used for training, never sold.",
  },
];

function Cell({ value }: { value: Value }) {
  if (value === null) return <Minus className="mx-auto size-3.5 text-ghost" />;
  if (value === true)
    return <Check className="mx-auto size-4 text-c-green" strokeWidth={2.5} />;
  return <span className="text-[13px] text-primary">{value}</span>;
}

export default function Pricing() {
  return (
    <div className="min-h-dvh bg-page">
      <header className="flex h-16 items-center px-6">
        <Link href="/" aria-label="Codarc home">
          <Wordmark size="md" />
        </Link>
        <Link
          href="/"
          className="notion-hover ml-auto flex items-center gap-1.5 px-2 py-1 text-[13.5px] text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" /> Back
        </Link>
      </header>

      <main className="pb-24">
        {/* ---------------------------------------------------- the plans */}
        <section className="relative overflow-hidden pt-10 pb-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-32 left-1/2 h-[460px] w-[900px] -translate-x-1/2 opacity-50 blur-[90px] dark:opacity-35"
            style={{
              background:
                "radial-gradient(40% 50% at 26% 50%, rgb(107 70 245 / 0.26), transparent 70%), radial-gradient(40% 50% at 56% 44%, rgb(18 112 248 / 0.24), transparent 70%), radial-gradient(38% 46% at 82% 54%, rgb(250 194 73 / 0.26), transparent 70%)",
            }}
          />
          <Container className="relative">
            <div className="mx-auto max-w-[620px] text-center">
              <h1 className="text-[40px] leading-[1.1] font-bold tracking-[-0.03em] text-primary md:text-[52px]">
                No free tier. On purpose.
              </h1>
              <p className="mx-auto mt-4 max-w-[48ch] text-[17px] leading-[1.6] text-secondary">
                Codarc reads real code and writes real changes, so it costs real
                money to run. Looking at your map is free. Everything after that
                is what you&apos;re paying for.
              </p>
            </div>

            <div className="mx-auto mt-12 grid max-w-[860px] gap-3 md:grid-cols-2">
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "flex flex-col rounded-xl p-6",
                    p.featured
                      ? "bg-page shadow-[0_0_0_1.5px_var(--accent),var(--shadow-card)]"
                      : "bg-sunken",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-primary">
                      {p.name}
                    </h2>
                    {p.featured && (
                      <span className="rounded-full bg-selected px-2 py-0.5 text-[11px] font-medium text-accent-text">
                        Most chosen
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13.5px] text-secondary">
                    {p.tagline}
                  </p>

                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="text-[44px] leading-none font-bold tracking-[-0.03em] text-primary">
                      ${p.price}
                    </span>
                    <span className="text-[14px] text-tertiary">/ month</span>
                  </div>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check className="mt-[3px] size-3.5 shrink-0 text-c-green" />
                        <span className="text-[13.5px] leading-[1.5] text-secondary">
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link href={`/choose?plan=${p.id}`} className="mt-7 block">
                    <Button
                      variant={p.featured ? "primary" : "secondary"}
                      size="lg"
                      className="h-10 w-full text-[14px]"
                    >
                      Choose {p.name}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            <p className="mt-5 text-center text-[13px] text-tertiary">
              Thirty days, money back, no conversation required.
            </p>
          </Container>
        </section>

        {/* ------------------------------------------- what it can read */}
        <section id="stacks" className="scroll-mt-16 py-10">
          <Container>
            <StackWall />
          </Container>
        </section>

        {/* ---------------------------------------------- side by side */}
        <section className="py-16">
          <Container>
            <div className="mx-auto max-w-[860px] overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse">
                <thead>
                  <tr>
                    <th className="w-1/2 pb-4 text-left text-[13px] font-medium text-tertiary">
                      Everything in detail
                    </th>
                    {PLANS.map((p) => (
                      <th
                        key={p.id}
                        className="pb-4 text-center text-[14px] font-semibold text-primary"
                      >
                        {p.name}
                        <span className="block text-[12px] font-normal text-tertiary">
                          ${p.price}/mo
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON.map((group) => (
                    <React.Fragment key={group.group}>
                      <tr>
                        <td
                          colSpan={3}
                          className="pt-8 pb-2 text-[12px] font-medium text-tertiary"
                        >
                          {group.group}
                        </td>
                      </tr>
                      {group.rows.map((row) => (
                        <tr
                          key={row.label}
                          className="shadow-[inset_0_1px_0_0_var(--border)]"
                        >
                          <td className="py-3 pr-4">
                            <div className="text-[13.5px] text-primary">
                              {row.label}
                            </div>
                            {row.note && (
                              <div className="text-[12px] text-tertiary">
                                {row.note}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Cell value={row.solo} />
                          </td>
                          <td className="px-3 py-3 text-center">
                            <Cell value={row.studio} />
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </Container>
        </section>

        {/* ------------------------------------------------------- faq */}
        <section className="py-16">
          <Container>
            <div className="mx-auto max-w-[680px]">
              <h2 className="text-center text-[32px] leading-[1.15] font-bold tracking-[-0.025em] text-primary">
                Questions people actually ask
              </h2>

              <div className="mt-10 space-y-8">
                {FAQ.map((item) => (
                  <div key={item.q}>
                    <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-primary">
                      {item.q}
                    </h3>
                    <p className="mt-2 text-[15px] leading-[1.6] text-secondary">
                      {item.a}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-14 rounded-xl bg-sunken p-6 text-center">
                <p className="text-[15px] leading-[1.6] text-primary">
                  Still not sure? Map a repository first — that part costs
                  nothing and takes about five seconds.
                </p>
                <Link href="/#start" className="mt-4 inline-block">
                  <Button variant="primary" size="lg" className="h-10 px-4">
                    Try it first
                  </Button>
                </Link>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
