import { Wordmark } from "@/components/logo";
import { Container, Section } from "@/components/landing/shared";
import { RepoInput } from "@/components/landing/repo-input";
import { Reveal } from "@/components/landing/reveal";

const cols = [
  {
    title: "Product",
    links: ["How it works", "Pricing", "Changelog", "Status"],
  },
  { title: "Resources", links: ["Docs", "Supported stacks", "Security", "API"] },
  { title: "Company", links: ["About", "Contact", "Terms", "Privacy"] },
];

export function Closing() {
  return (
    <>
      <Section id="start" className="relative overflow-hidden scroll-mt-16">
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-[380px] w-[820px] -translate-x-1/2 -translate-y-1/2 opacity-50 blur-[90px] dark:opacity-35"
          style={{
            background:
              "radial-gradient(40% 50% at 26% 50%, rgb(107 70 245 / 0.28), transparent 70%), radial-gradient(40% 50% at 54% 46%, rgb(18 112 248 / 0.26), transparent 70%), radial-gradient(38% 46% at 80% 54%, rgb(250 194 73 / 0.28), transparent 70%)",
          }}
        />
        <Container className="relative">
          <Reveal className="mx-auto max-w-[680px] text-center">
            <h2 className="text-[34px] leading-[1.1] font-bold tracking-[-0.03em] text-primary md:text-[44px]">
              Point Codarc at your app.
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-[17px] leading-[1.55] text-secondary">
              Paste a public link and watch it draw. Connect your own project
              when you want it making changes.
            </p>

            <div className="mt-8">
              <RepoInput />
            </div>
          </Reveal>
        </Container>
      </Section>

      <footer className="bg-sunken py-14">
        <Container>
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-[300px]">
              <Wordmark size="md" />
              <p className="mt-3 text-[13.5px] leading-[1.55] text-tertiary">
                You shouldn&apos;t have to read forty files to change one thing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-3">
              {cols.map((c) => (
                <div key={c.title}>
                  <div className="mb-3 text-[12px] font-medium text-tertiary">
                    {c.title}
                  </div>
                  <ul className="space-y-2">
                    {c.links.map((l) => (
                      <li key={l}>
                        <a
                          href="#"
                          className="text-[13.5px] text-secondary hover:text-primary"
                        >
                          {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2 pt-6 text-[12.5px] text-tertiary shadow-[inset_0_1px_0_0_var(--border)] sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Codarc</span>
            <a href="/design" className="hover:text-secondary">
              Design language
            </a>
          </div>
        </Container>
      </footer>
    </>
  );
}
