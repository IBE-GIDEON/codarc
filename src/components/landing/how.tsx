import {
  Check,
  GitPullRequest,
  Link2,
  MousePointer2,
} from "lucide-react";
import {
  Container,
  Eyebrow,
  Lede,
  Section,
  SectionTitle,
} from "@/components/landing/shared";
import { GithubMark } from "@/components/brand-marks";
import { cn } from "@/lib/cn";

function Step({
  n,
  title,
  body,
  visual,
  className,
}: {
  n: string;
  title: string;
  body: string;
  visual: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl bg-sunken",
        className,
      )}
    >
      <div className="p-6 pb-0">
        <div className="mb-3 flex size-6 items-center justify-center rounded-full bg-[rgb(var(--ink)/0.07)] font-mono text-[11px] text-secondary">
          {n}
        </div>
        <h3 className="text-[18px] font-semibold tracking-[-0.015em] text-primary">
          {title}
        </h3>
        <p className="mt-1.5 text-[14px] leading-[1.5] text-secondary">{body}</p>
      </div>
      <div className="mt-6 flex-1 px-6 pb-6">{visual}</div>
    </div>
  );
}

export function How() {
  return (
    <Section id="how">
      <Container>
        <div className="max-w-[680px]">
          <Eyebrow>How it works</Eyebrow>
          <SectionTitle>From repo to pull request in four moves.</SectionTitle>
          <Lede>
            No IDE. No terminal. No reading a file you&apos;ve never opened to
            find out where the thing you want to change actually lives.
          </Lede>
        </div>

        <div className="mt-12 grid gap-3 md:grid-cols-2">
          <Step
            n="1"
            title="Connect"
            body="Install the GitHub app on the repos you choose, or paste a public URL and skip the account entirely."
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
                    github.com/you/trendstack-api
                  </span>
                </div>
              </div>
            }
          />

          <Step
            n="2"
            title="Map"
            body="Codarc reads the repo and lays out routes, services and data. Auto-arranged, and your nudges survive every re-scan."
            visual={
              <div className="canvas-grid h-[118px] rounded-md p-3 shadow-[inset_0_0_0_1px_var(--border)]">
                <div className="flex h-full items-center justify-between gap-2">
                  {(
                    [
                      ["var(--brand-purple)", ["/login", "/me", "/hook"]],
                      ["var(--brand-blue)", ["Auth", "Billing"]],
                      ["var(--brand-amber)", ["User", "Session"]],
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
                          <span className="truncate font-mono text-[9px] text-secondary">
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
            title="Point"
            body="Click the node you want to change and say what it should do. The prompt is attached to the code — you never describe where."
            visual={
              <div className="relative rounded-md bg-raised p-3 shadow-card">
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-[4px] rounded-full"
                    style={{ background: "var(--brand-blue)" }}
                  />
                  <span className="font-mono text-[11px] text-primary">
                    AuthService
                  </span>
                  <MousePointer2 className="ml-auto size-3.5 text-accent" />
                </div>
                <div className="mt-2 rounded-sm bg-sunken p-2 shadow-[inset_0_0_0_1px_var(--border)]">
                  <span className="text-[12px] text-primary">
                    Rate limit login to 5 tries a minute
                  </span>
                  <span className="ml-px inline-block h-3 w-px translate-y-[2px] bg-accent" />
                </div>
              </div>
            }
          />

          <Step
            n="4"
            title="Ship"
            body="Read the diff before anything moves, then open a PR. Codarc never writes to your branch and never force-pushes."
            visual={
              <div className="rounded-md bg-raised p-3 shadow-card">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="size-4 text-c-green" />
                  <span className="text-[12px] font-medium text-primary">
                    Add login rate limiting
                  </span>
                  <span className="ml-auto rounded-full bg-c-green-bg px-1.5 py-px text-[10px] font-medium text-c-green">
                    open
                  </span>
                </div>
                <div className="mt-2 space-y-1 font-mono text-[10px]">
                  <div className="flex items-center gap-1.5 text-c-green">
                    <Check className="size-3" /> services/auth.py +6 −1
                  </div>
                  <div className="flex items-center gap-1.5 text-c-green">
                    <Check className="size-3" /> requirements.txt +1 −0
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
