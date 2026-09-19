import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Container, Section } from "@/components/landing/shared";

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
      <Section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-1/2 h-[380px] w-[820px] -translate-x-1/2 -translate-y-1/2 opacity-50 blur-[90px] dark:opacity-35"
          style={{
            background:
              "radial-gradient(40% 50% at 26% 50%, rgb(107 70 245 / 0.28), transparent 70%), radial-gradient(40% 50% at 54% 46%, rgb(18 112 248 / 0.26), transparent 70%), radial-gradient(38% 46% at 80% 54%, rgb(250 194 73 / 0.28), transparent 70%)",
          }}
        />
        <Container className="relative">
          <div className="mx-auto max-w-[680px] text-center">
            <h2 className="text-[34px] leading-[1.1] font-bold tracking-[-0.03em] text-primary md:text-[44px]">
              Point Codarc at a repository.
            </h2>
            <p className="mx-auto mt-4 max-w-[46ch] text-[17px] leading-[1.55] text-secondary">
              Paste a public URL and watch it draw. Connect the private one when
              you want the pull request.
            </p>

            <div className="mx-auto mt-8 flex max-w-[520px] flex-col gap-2 sm:flex-row">
              <input
                placeholder="github.com/you/your-repo"
                aria-label="Repository URL"
                className="h-11 flex-1 rounded-md bg-page px-3.5 font-mono text-[13.5px] text-primary shadow-[inset_0_0_0_1px_var(--border)] placeholder:text-tertiary"
              />
              <Button
                variant="primary"
                size="lg"
                className="h-11 shrink-0 px-4 text-[15px]"
              >
                Map it <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      <footer className="bg-sunken py-14">
        <Container>
          <div className="flex flex-col gap-10 md:flex-row md:justify-between">
            <div className="max-w-[300px]">
              <div className="flex items-center gap-2">
                <Logo className="size-6 text-primary" />
                <span className="text-[15px] font-semibold tracking-[-0.01em] text-primary">
                  Codarc
                </span>
              </div>
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
