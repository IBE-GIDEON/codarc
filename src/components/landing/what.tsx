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

const items = [
  {
    icon: LayoutGrid,
    title: "Layout that survives a re-scan",
    body: "Auto-arranged on every sync, with your manual nudges stored as offsets. Re-reading the repo never destroys how you arranged it.",
  },
  {
    icon: MessageSquareCode,
    title: "Prompts anchored to code",
    body: "The box you type in belongs to a node, so the agent already knows which files it may touch. You describe what, never where.",
  },
  {
    icon: ScanLine,
    title: "Diff before anything moves",
    body: "Every change arrives as a reviewable patch. Nothing is applied because an agent felt confident about it.",
  },
  {
    icon: GitPullRequest,
    title: "Pull requests, always",
    body: "Codarc opens a branch and a PR. It never commits to your default branch and never force-pushes.",
  },
  {
    icon: EyeOff,
    title: "Your code is not training data",
    body: "Repositories are read for the session that needs them. Nothing is retained to train a model, ever.",
  },
  {
    icon: ShieldCheck,
    title: "Scoped access, per repo",
    body: "The GitHub app only sees repositories you explicitly select, and you can revoke any of them in one click.",
  },
];

export function What() {
  return (
    <Section id="what" className="bg-sunken">
      <Container>
        <div className="max-w-[680px]">
          <Eyebrow>What it actually does</Eyebrow>
          <SectionTitle>Not just a picture of your code.</SectionTitle>
          <Lede>
            Plenty of tools will draw your repo. The diagram is the easy half —
            what matters is whether you can change anything from it.
          </Lede>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl bg-page p-5 shadow-card">
              <Icon className="size-[18px] text-tertiary" strokeWidth={1.75} />
              <h3 className="mt-3.5 text-[15px] font-semibold tracking-[-0.01em] text-primary">
                {title}
              </h3>
              <p className="mt-1.5 text-[13.5px] leading-[1.55] text-secondary">
                {body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </Section>
  );
}
