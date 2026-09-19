import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Container,
  Eyebrow,
  Lede,
  Section,
  SectionTitle,
} from "@/components/landing/shared";
import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/cn";

const plans = [
  {
    name: "Solo",
    price: "29",
    tagline: "For the founder who built it on their own.",
    features: [
      "3 projects",
      "Redraw your app as often as you like",
      "100 changes a month",
      "Changes arrive as proposals to approve",
      "Works with Python and JavaScript apps",
    ],
    cta: "Start with Solo",
    featured: false,
  },
  {
    name: "Studio",
    price: "79",
    tagline: "For when someone else has to understand it too.",
    features: [
      "As many projects as you want",
      "5 people, sharing the same map",
      "Unlimited changes",
      "Faster reading of big projects",
      "Exports for handing work to a developer",
      "Private deployment on request",
    ],
    cta: "Start with Studio",
    featured: true,
  },
];

export function Pricing() {
  return (
    <Section id="pricing" className="scroll-mt-16">
      <Container>
        <div className="max-w-[700px]">
          <Reveal>
            <Eyebrow>Pricing</Eyebrow>
            <SectionTitle>No free tier. On purpose.</SectionTitle>
          </Reveal>
          <Reveal delay={80}>
            <Lede>
              Free plans mean queues, limits, and your app waiting behind
              somebody else&apos;s free ride. Codarc reads real projects and
              writes real changes, so it costs real money from day one.
            </Lede>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-2">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 80} className="flex">
            <div
              className={cn(
                "lift flex flex-1 flex-col rounded-xl p-6",
                p.featured
                  ? "bg-page shadow-[0_0_0_1.5px_var(--accent),var(--shadow-card)]"
                  : "bg-sunken",
              )}
            >
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-primary">
                  {p.name}
                </h3>
                {p.featured && (
                  <span className="rounded-full bg-selected px-2 py-0.5 text-[11px] font-medium text-accent-text">
                    Most chosen
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13.5px] text-secondary">{p.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-[40px] leading-none font-bold tracking-[-0.03em] text-primary">
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

              <a href={`/choose?plan=${p.name.toLowerCase()}`} className="mt-7 block">
                <Button
                  variant={p.featured ? "primary" : "secondary"}
                  size="lg"
                  className="h-10 w-full text-[14px]"
                >
                  {p.cta}
                </Button>
              </a>
            </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={140}>
          <p className="mt-5 text-center text-[13px] text-tertiary">
            Thirty days, money back, no conversation required.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}
