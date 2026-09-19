import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Container,
  Eyebrow,
  Lede,
  Section,
  SectionTitle,
} from "@/components/landing/shared";
import { cn } from "@/lib/cn";

const plans = [
  {
    name: "Solo",
    price: "29",
    tagline: "For the founder who built it alone.",
    features: [
      "3 repositories",
      "Unlimited architecture maps",
      "100 changes a month",
      "Pull requests to your branches",
      "Python and TypeScript",
    ],
    cta: "Start with Solo",
    featured: false,
  },
  {
    name: "Studio",
    price: "79",
    tagline: "For when someone else has to read it too.",
    features: [
      "Unlimited repositories",
      "5 seats, shared maps and comments",
      "Unlimited changes",
      "Priority runs on large repos",
      "Handoff exports for contractors",
      "Private deployment on request",
    ],
    cta: "Start with Studio",
    featured: true,
  },
];

export function Pricing() {
  return (
    <Section id="pricing">
      <Container>
        <div className="max-w-[680px]">
          <Eyebrow>Pricing</Eyebrow>
          <SectionTitle>No free tier. On purpose.</SectionTitle>
          <Lede>
            Free tiers mean queues, rate limits, and your repository waiting
            behind someone else&apos;s abuse budget. Codarc reads real
            codebases and opens real pull requests, so it costs real money from
            the first day.
          </Lede>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.name}
              className={cn(
                "flex flex-col rounded-xl p-6",
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

              <Button
                variant={p.featured ? "primary" : "secondary"}
                size="lg"
                className="mt-7 h-10 w-full text-[14px]"
              >
                {p.cta}
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-[13px] text-tertiary">
          Thirty days, money back, no conversation required.
        </p>
      </Container>
    </Section>
  );
}
