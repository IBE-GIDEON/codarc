import {
  Container,
  Eyebrow,
  Lede,
  Section,
  SectionTitle,
} from "@/components/landing/shared";
import { Reveal } from "@/components/landing/reveal";
import {
  DescribeVisual,
  LayoutVisual,
  PrivacyVisual,
  ReviewVisual,
  SafeVisual,
  ScopeVisual,
} from "@/components/landing/what-visuals";
import { cn } from "@/lib/cn";

const CELLS = [
  {
    title: "Your layout stays put",
    body: "Drag the boxes wherever they make sense to you. Re-reading your app never shuffles them back.",
    visual: <LayoutVisual />,
    span: "lg:col-span-2",
  },
  {
    title: "You say what, never where",
    body: "The box you clicked is already attached to the right files.",
    visual: <DescribeVisual />,
    span: "",
  },
  {
    title: "Nothing moves without you",
    body: "Every change is shown in plain words before it happens.",
    visual: <ReviewVisual />,
    span: "",
  },
  {
    title: "Your live app is never touched",
    body: "Changes wait on a copy. What your customers use carries on exactly as it was until you say yes.",
    visual: <SafeVisual />,
    span: "lg:col-span-2",
  },
  {
    title: "Your code is not training data",
    body: "Read to answer your question, then gone.",
    visual: <PrivacyVisual />,
    span: "",
  },
  {
    title: "Only the projects you pick",
    body: "Codarc sees what you hand it and nothing else. Take it back in one click.",
    visual: <ScopeVisual />,
    span: "lg:col-span-2",
  },
];

export function What() {
  return (
    <Section id="what" className="scroll-mt-16 bg-sunken">
      <Container>
        <div className="max-w-[700px]">
          <Reveal>
            <Eyebrow>What it actually does</Eyebrow>
            <SectionTitle>Not just a picture of your app.</SectionTitle>
          </Reveal>
          <Reveal delay={80}>
            <Lede>
              Plenty of tools will draw you a diagram. Drawing is the easy half.
              The question is whether you can change anything from it.
            </Lede>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CELLS.map((cell, i) => (
            <Reveal key={cell.title} delay={(i % 3) * 70} className={cn("flex", cell.span)}>
              <div className="lift flex flex-1 flex-col overflow-hidden rounded-xl bg-page shadow-card hover:shadow-popover">
                {/* picture first — it's doing the explaining */}
                <div className="flex min-h-[152px] flex-1 items-center justify-center p-5">
                  <div className="w-full">{cell.visual}</div>
                </div>
                <div className="p-5 pt-0">
                  <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-primary">
                    {cell.title}
                  </h3>
                  <p className="mt-1 text-[13.5px] leading-[1.55] text-secondary">
                    {cell.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
