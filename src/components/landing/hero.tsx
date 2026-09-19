import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container, Frame, Highlight } from "@/components/landing/shared";
import { ProductShot } from "@/components/landing/product-shot";

const stacks = ["FastAPI", "Next.js", "Django", "Express", "Flask", "NestJS"];

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
        <div className="mx-auto max-w-[820px] text-center">
          <h1 className="text-[42px] leading-[1.06] font-bold tracking-[-0.035em] text-primary sm:text-[56px] md:text-[64px]">
            See the code you shipped.
            <br />
            Change it by <Highlight>pointing</Highlight>
          </h1>

          <p className="mx-auto mt-6 max-w-[58ch] text-[17px] leading-[1.55] text-secondary md:text-[19px]">
            Codarc turns any repository into a live architecture map. Click a
            node, describe the change in plain English, and get a pull request.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
            <Button variant="primary" size="lg" className="h-10 px-4 text-[15px]">
              Try Codarc <ArrowRight className="size-4" />
            </Button>
            <Button variant="secondary" size="lg" className="h-10 px-4 text-[15px]">
              See how it works
            </Button>
          </div>

          <p className="mt-4 text-[13px] text-tertiary">
            Paid from day one. No free tier, no rate-limited toy.
          </p>
        </div>

        <div className="relative mx-auto mt-14 max-w-[1040px]">
          <Frame>
            <ProductShot />
          </Frame>
          {/* fade the shot into the page rather than ending it with a hard edge */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 rounded-b-xl bg-gradient-to-b from-transparent to-page"
          />
        </div>

        <div className="mt-14 flex flex-col items-center gap-4">
          <p className="text-[13px] text-tertiary">
            Reads the stacks founders actually ship on
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {stacks.map((s) => (
              <span
                key={s}
                className="text-[15px] font-medium tracking-[-0.01em] text-ghost"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
