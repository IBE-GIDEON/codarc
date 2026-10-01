import { Container, Section } from "@/components/landing/shared";
import { SiteFooter } from "@/components/landing/site-footer";
import { RepoInput } from "@/components/landing/repo-input";
import { Reveal } from "@/components/landing/reveal";
import { Button } from "@/components/ui/button";
import { GithubMark } from "@/components/brand-marks";
import { DEMO, SIGN_UP } from "@/components/landing/sign-up";

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
              Sign up and connect it, and Codarc draws the whole thing. Or take
              your free look first — one app, no account, nothing to install.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
              <a href={SIGN_UP}>
                <Button variant="primary" size="lg" className="h-11 px-5 text-[15px]">
                  <GithubMark className="size-4" /> Sign up free
                </Button>
              </a>
              <a href={DEMO}>
                <Button variant="secondary" size="lg" className="h-11 px-5 text-[15px]">
                  Try a demo project
                </Button>
              </a>
            </div>

            {/* The quietest way in, for anyone not ready to hand over a login. */}
            <div className="mt-12">
              <p className="mb-3 text-[13px] text-tertiary">
                Or spend your free look on any public repository
              </p>
              <RepoInput />
            </div>
          </Reveal>
        </Container>
      </Section>

      <SiteFooter />
    </>
  );
}
