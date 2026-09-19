import { Check, GitPullRequest, Link2, MousePointer2 } from "lucide-react";
import {
  Container,
  Eyebrow,
  Lede,
  Section,
  SectionTitle,
} from "@/components/landing/shared";
import { Reveal } from "@/components/landing/reveal";
import { GithubMark } from "@/components/brand-marks";
import { cn } from "@/lib/cn";

function Step({
  n,
  title,
  body,
  visual,
  delay,
}: {
  n: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  delay: number;
}) {
  return (
    <Reveal delay={delay} className="flex">
      <div
        className={cn(
          "lift flex flex-1 flex-col overflow-hidden rounded-xl bg-sunken",
        )}
      >
        <div className="p-6 pb-0">
          <div className="mb-3 flex size-6 items-center justify-center rounded-full bg-[rgb(var(--ink)/0.07)] font-mono text-[11px] text-secondary">
            {n}
          </div>
          <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-primary">
            {title}
          </h3>
          <p className="mt-1.5 text-[14px] leading-[1.55] text-secondary">
            {body}
          </p>
        </div>
        <div className="mt-6 flex-1 px-6 pb-6">{visual}</div>
      </div>
    </Reveal>
  );
}

export function How() {
  return (
    <Section id="how" className="scroll-mt-16">
      <Container>
        <div className="max-w-[700px]">
          <Reveal as="div">
            <Eyebrow>How it works</Eyebrow>
            <SectionTitle>
              From your code to a finished change, in four steps.
            </SectionTitle>
          </Reveal>
          <Reveal delay={80}>
            <Lede>
              No code editor. No terminal. No hunting through forty files you
              have never opened to find the one you need.
            </Lede>
          </Reveal>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-2">
          <Step
            n="1"
            delay={0}
            title="Point it at your app"
            body="Give Codarc permission to read a project you already keep on GitHub. If it's public, paste the link and skip signing up entirely."
            visual={
              <div className="space-y-2">
                <div className="flex h-10 items-center gap-2 rounded-md bg-raised px-3 shadow-card">
                  <GithubMark className="size-4 text-primary" />
                  <span className="text-[13px] font-medium text-primary">
                    Continue with GitHub
                  </span>
                </div>
                <div className="flex h-10 items-center gap-2 rounded-md bg-page px-3 shadow-[inset_0_0_0_1px_var(--border)]">
                  <Link2 className="size-4 text-tertiary" />
                  <span className="font-mono text-[12px] text-tertiary">
                    github.com/you/your-app
                  </span>
                </div>
              </div>
            }
          />

          <Step
            n="2"
            delay={70}
            title="Watch it draw your app"
            body="Codarc reads everything and lays it out: the pages people see, the places requests arrive, the parts doing the work, and where your information is kept."
            visual={
              <div className="canvas-grid h-[118px] rounded-md p-3 shadow-[inset_0_0_0_1px_var(--border)]">
                <div className="flex h-full items-center justify-between gap-2">
                  {(
                    [
                      ["var(--brand-purple)", ["Sign in", "My profile", "Pay"]],
                      ["var(--brand-blue)", ["Accounts", "Billing"]],
                      ["var(--brand-amber)", ["Customer", "Order"]],
                    ] as const
                  ).map(([hue, items], i) => (
                    <div key={i} className="flex flex-1 flex-col gap-1.5">
                      {items.map((label) => (
                        <div
                          key={label}
                          className="flex items-center gap-1.5 rounded-sm bg-raised px-1.5 py-1 shadow-card"
                        >
                          <span
                            className="h-3 w-[3px] shrink-0 rounded-full"
                            style={{ background: hue }}
                          />
                          <span className="truncate text-[9px] text-secondary">
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            }
          />

          <Step
            n="3"
            delay={0}
            title="Say what you want different"
            body="Click the box you care about and describe the change the way you'd explain it to a person. You never have to say which file — Codarc already knows."
            visual={
              <div className="relative rounded-md bg-raised p-3 shadow-card">
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-[4px] rounded-full"
                    style={{ background: "var(--brand-blue)" }}
                  />
                  <span className="text-[11.5px] font-medium text-primary">
                    Sign-in logic
                  </span>
                  <MousePointer2 className="ml-auto size-3.5 text-accent" />
                </div>
                <div className="mt-2 rounded-sm bg-sunken p-2 shadow-[inset_0_0_0_1px_var(--border)]">
                  <span className="text-[12px] text-primary">
                    Lock someone out after 5 failed tries
                  </span>
                  <span className="caret ml-px inline-block h-3 w-px translate-y-[2px] bg-accent" />
                </div>
              </div>
            }
          />

          <Step
            n="4"
            delay={70}
            title="Approve it, or don't"
            body="You see exactly what would change before anything happens. Codarc never touches your live app — it hands you a proposal you can accept, edit or throw away."
            visual={
              <div className="rounded-md bg-raised p-3 shadow-card">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="size-4 text-c-green" />
                  <span className="text-[12px] font-medium text-primary">
                    Lock out repeated sign-in attempts
                  </span>
                  <span className="ml-auto rounded-full bg-c-green-bg px-1.5 py-px text-[10px] font-medium text-c-green">
                    waiting for you
                  </span>
                </div>
                <div className="mt-2 space-y-1 font-mono text-[10px]">
                  <div className="flex items-center gap-1.5 text-c-green">
                    <Check className="size-3" /> 6 lines added
                  </div>
                  <div className="flex items-center gap-1.5 text-c-green">
                    <Check className="size-3" /> 2 files touched
                  </div>
                </div>
              </div>
            }
          />
        </div>
      </Container>
    </Section>
  );
}
