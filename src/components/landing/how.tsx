"use client";

import * as React from "react";
import {
  Container,
  Eyebrow,
  Lede,
  Section,
  SectionTitle,
} from "@/components/landing/shared";
import { Reveal } from "@/components/landing/reveal";
import {
  ApproveVisual,
  ConnectVisual,
  MapVisual,
  PointVisual,
} from "@/components/landing/how-visuals";
import { cn } from "@/lib/cn";

const STEPS = [
  {
    n: "1",
    title: "Point it at your app",
    body: "Give Codarc permission to look at a project you already keep on GitHub. If it's public you can paste the link and skip signing up entirely.",
    visual: <ConnectVisual />,
  },
  {
    n: "2",
    title: "Watch it draw your app",
    body: "It reads everything and lays the whole thing out as a picture — the pages people see, the places requests arrive, the parts doing the work, and where your information is kept.",
    visual: <MapVisual />,
  },
  {
    n: "3",
    title: "Say what you want different",
    body: "Click the box you care about and describe the change the way you'd explain it to a friend. You never say which file, because the box already knows.",
    visual: <PointVisual />,
  },
  {
    n: "4",
    title: "Approve it, or don't",
    body: "Codarc shows you what would be different in plain words before anything happens. Your live app is untouched until you say yes.",
    visual: <ApproveVisual />,
  },
];

export function How() {
  const [active, setActive] = React.useState(0);
  const hostRef = React.useRef<HTMLDivElement>(null);

  // Whichever step is nearest the middle of the screen owns the panel.
  // Measured straight from scroll position: an IntersectionObserver band thin
  // enough to hold one step at a time never reaches a useful threshold when
  // the steps are themselves taller than the viewport.
  //
  // Deliberately no requestAnimationFrame — it doesn't run in a hidden tab,
  // which leaves the panel stuck on whatever it showed last. Four rect reads
  // per scroll is cheap enough to just do.
  React.useEffect(() => {
    const measure = () => {
      const middle = window.innerHeight / 2;
      let nearest = 0;
      let shortest = Infinity;

      const steps =
        hostRef.current?.querySelectorAll<HTMLElement>("[data-step]") ?? [];

      steps.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const distance = Math.abs(r.top + r.height / 2 - middle);
        if (distance < shortest) {
          shortest = distance;
          nearest = i;
        }
      });

      setActive(nearest);
    };

    // Deferred rather than called here, so this isn't a synchronous setState
    // in an effect body.
    const initial = window.setTimeout(measure, 0);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  return (
    <Section id="how" className="scroll-mt-16">
      <Container>
        <div className="max-w-[700px]">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <SectionTitle>
              From your code to a finished change, in four steps.
            </SectionTitle>
          </Reveal>
          <Reveal delay={80}>
            <Lede>
              No code editor. No terminal. Nothing you have to learn first. If
              you can describe what you want, you can do this.
            </Lede>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-14">
          {/* left — scrolls */}
          <div ref={hostRef}>
            {STEPS.map((step, i) => (
              <div
                key={step.n}
                data-step={i}
                className="md:flex md:min-h-[78vh] md:flex-col md:justify-center"
              >
                <div
                  className={cn(
                    "transition-opacity duration-500 ease-[var(--ease-soft)]",
                    // Dim the steps you aren't on, so the eye knows where it is.
                    "md:opacity-35",
                    i === active && "md:opacity-100",
                  )}
                >
                  <div className="flex size-6 items-center justify-center rounded-full bg-[rgb(var(--ink)/0.07)] font-mono text-[11px] text-secondary">
                    {step.n}
                  </div>
                  <h3 className="mt-3.5 text-[22px] leading-[1.25] font-semibold tracking-[-0.02em] text-primary md:text-[26px]">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 max-w-[46ch] text-[15px] leading-[1.6] text-secondary md:text-[16px]">
                    {step.body}
                  </p>
                </div>

                {/* On a phone there's no room to pin anything — the picture
                    simply follows its own step. */}
                <div className="mt-5 h-[300px] md:hidden">{step.visual}</div>

                {i < STEPS.length - 1 && (
                  <div className="h-px w-full bg-line md:hidden" />
                )}
              </div>
            ))}
          </div>

          {/* right — stays put, swaps picture */}
          <div className="hidden md:block">
            {/* Centred in the viewport rather than pinned under the nav, so the
                picture sits opposite whichever step you are reading. */}
            <div className="sticky top-[calc(50vh-212px)] h-[424px]">
              {STEPS.map((step, i) => (
                <div
                  key={step.n}
                  aria-hidden={i !== active}
                  className={cn(
                    "absolute inset-0 transition-all duration-500 ease-[var(--ease-soft)]",
                    i === active
                      ? "translate-y-0 opacity-100"
                      : "pointer-events-none translate-y-2 opacity-0",
                  )}
                >
                  {step.visual}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
