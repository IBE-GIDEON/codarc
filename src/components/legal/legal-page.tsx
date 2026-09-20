import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Wordmark } from "@/components/logo";
import { SiteFooter } from "@/components/landing/site-footer";

/**
 * Legal pages, written to be read. Same reading column as the rest of the
 * product, same plain language — a customer who can't read code shouldn't be
 * handed a wall of clauses either.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
}) {
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

      <main className="mx-auto w-full max-w-reading px-6 pt-10 pb-24">
        <h1 className="text-[40px] leading-[1.15] font-bold tracking-[-0.03em] text-primary">
          {title}
        </h1>
        <p className="mt-2 text-[13px] text-tertiary">Last updated {updated}</p>

        <p className="mt-6 rounded-sm bg-sunken p-4 text-[15px] leading-[1.6] text-primary">
          {intro}
        </p>

        {sections.map((s) => (
          <section key={s.heading} className="mt-10">
            <h2 className="text-[20px] leading-[1.3] font-semibold tracking-[-0.015em] text-primary">
              {s.heading}
            </h2>
            {s.body.map((para) => (
              <p
                key={para.slice(0, 40)}
                className="mt-3 text-[16px] leading-[1.6] text-secondary"
              >
                {para}
              </p>
            ))}
          </section>
        ))}
      </main>

      <SiteFooter />
    </div>
  );
}
