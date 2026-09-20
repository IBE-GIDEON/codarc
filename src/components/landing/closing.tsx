import { Container, Section } from "@/components/landing/shared";
import { SiteFooter } from "@/components/landing/site-footer";
import { RepoInput } from "@/components/landing/repo-input";
import { Reveal } from "@/components/landing/reveal";

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

      <SiteFooter />
    </>
  );
}
