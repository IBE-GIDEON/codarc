import {
  EyeOff,
  GitPullRequest,
  LayoutGrid,
  MessageSquareCode,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import {
  Container,
  Eyebrow,
  Lede,
  Section,
  SectionTitle,
} from "@/components/landing/shared";
import { Reveal } from "@/components/landing/reveal";

const items = [
  {
    icon: LayoutGrid,
    title: "Your layout stays put",
    body: "Drag the boxes wherever they make sense to you. When Codarc re-reads your app, your arrangement survives — it never shuffles everything back.",
  },
  {
    icon: MessageSquareCode,
    title: "You describe what, never where",
    body: "The box you clicked is attached to real files, so Codarc already knows where to look. You just say what should be different.",
  },
  {
    icon: ScanLine,
    title: "Nothing moves without you",
    body: "Every change is shown to you first, in plain terms and in full. Nothing is applied because software felt confident about it.",
  },
  {
    icon: GitPullRequest,
    title: "Your live app is never touched",
    body: "Changes arrive as a proposal on a separate copy. Your working app carries on exactly as it was until you say yes.",
  },
  {
    icon: EyeOff,
    title: "Your code is not training data",
    body: "We read your project to answer your question and that's the end of it. Nothing is kept to train a model, ever.",
  },
  {
    icon: ShieldCheck,
    title: "Only the projects you pick",
    body: "Codarc sees the projects you choose and nothing else, and you can take that access away in one click whenever you want.",
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
          {items.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={(i % 3) * 70} className="flex">
              <div className="lift flex-1 rounded-xl bg-page p-5 shadow-card hover:shadow-popover">
                <Icon className="size-[18px] text-tertiary" strokeWidth={1.75} />
                <h3 className="mt-3.5 text-[15px] font-semibold tracking-[-0.01em] text-primary">
                  {title}
                </h3>
                <p className="mt-1.5 text-[13.5px] leading-[1.55] text-secondary">
                  {body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
