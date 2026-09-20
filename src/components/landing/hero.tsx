import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Frame, Highlight } from "@/components/landing/shared";
import { ProductShot } from "@/components/landing/product-shot";
import { Reveal } from "@/components/landing/reveal";
import { StackWall } from "@/components/landing/stack-wall";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 md:pt-40">
      {/* Brand glow — the one place gradients are allowed to live. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[620px] w-[1100px] -translate-x-1/2 opacity-[0.55] blur-[90px] dark:opacity-40"
        style={{
          background:
            "radial-gradient(42% 52% at 28% 42%, rgb(107 70 245 / 0.30), transparent 70%), radial-gradient(40% 50% at 56% 34%, rgb(18 112 248 / 0.28), transparent 70%), radial-gradient(38% 46% at 78% 52%, rgb(250 194 73 / 0.30), transparent 70%)",
        }}
      />

      <Container className="relative">
        <div className="mx-auto max-w-[940px] text-center">
          <Reveal as="h1" className="text-balance text-[38px] leading-[1.08] font-bold tracking-[-0.035em] text-primary sm:text-[50px] md:text-[58px]">
            Codarc is the visual representation
            <br />
            of the <Highlight>codebase</Highlight> you already built.
          </Reveal>

          <Reveal
            as="p"
            delay={90}
            className="mx-auto mt-6 max-w-[56ch] text-[17px] leading-[1.6] text-secondary md:text-[19px]"
          >
            Codarc reads your code and draws the whole thing as a picture. Click
            any part, say what you want changed in ordinary words, and it writes
            the change and hands it back for you to approve.
          </Reveal>

          <Reveal
            delay={170}
            className="mt-8 flex flex-wrap items-center justify-center gap-2.5"
          >
            <a href="#start">
              <Button variant="primary" size="lg" className="h-11 px-5 text-[15px]">
                Map my app <ArrowRight className="size-4" />
              </Button>
            </a>
            <a href="#how">
              <Button variant="secondary" size="lg" className="h-11 px-5 text-[15px]">
                Show me how it works
              </Button>
            </a>
          </Reveal>

          <Reveal delay={230} as="p" className="mt-4 text-[13px] text-tertiary">
            You don&apos;t need to know how to code. You do need to own the app.
          </Reveal>
        </div>

        <Reveal delay={120} className="relative mx-auto mt-14 max-w-[1040px]">
          <Frame>
            <ProductShot />
          </Frame>
          {/* fade the shot into the page rather than ending it with a hard edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-xl bg-gradient-to-b from-transparent to-page"
          />
        </Reveal>

        <Reveal delay={80}>
          <StackWall className="mt-16" />
        </Reveal>
      </Container>
    </section>
  );
}
