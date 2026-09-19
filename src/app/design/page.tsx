import { Sidebar } from "@/components/sidebar";
import {
  Block,
  Code,
  Column,
  H2,
  P,
  PageHeader,
  TopBar,
} from "@/components/page-chrome";
import { Button, IconButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Callout } from "@/components/ui/callout";
import { Logo } from "@/components/logo";
import { CanvasPreview } from "@/components/canvas-preview";
import { ArrowRight, Copy, Trash2 } from "lucide-react";

const surfaces = [
  ["page", "bg-page", "The canvas. Nothing floats above it without reason."],
  ["sidebar", "bg-sidebar", "Sunken tint. Signals 'navigation', not 'panel'."],
  ["raised", "bg-raised", "Cards, popovers, menus."],
  ["code", "bg-code", "Code blocks and diffs."],
  ["hover", "bg-hover", "Ink at 5.5%. The most-used value in the system."],
];

const inks = [
  ["primary", "text-primary", "Headings, body, anything you read."],
  ["secondary", "text-secondary", "Sidebar rows, labels, metadata."],
  ["tertiary", "text-tertiary", "Placeholders, section labels, icons at rest."],
  ["ghost", "text-ghost", "Drag handles, dividers, disabled."],
];

const accents = [
  ["gray", "bg-c-gray"],
  ["brown", "bg-c-brown"],
  ["orange", "bg-c-orange"],
  ["yellow", "bg-c-yellow"],
  ["green", "bg-c-green"],
  ["blue", "bg-c-blue"],
  ["purple", "bg-c-purple"],
  ["pink", "bg-c-pink"],
  ["red", "bg-c-red"],
];

export default function Home() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col bg-page">
        <TopBar trail={["Codarc", "Design", "Language"]} />
        <div className="min-h-0 flex-1 overflow-y-auto pb-32">
          <Column>
            <PageHeader
              icon="🧭"
              title="Design language"
              subtitle="Notion, faithfully. Warm ink, small radii, quiet chrome, instant hover."
            />

            <Block className="my-6">
              <Callout icon="📐" tone="blue">
                Every value below is a token in{" "}
                <Code>src/app/globals.css</Code>. Nothing in a component should
                ever hard-code a hex, a radius, or a shadow.
              </Callout>
            </Block>

            {/* ---------------------------------------------------------- */}
            <H2>0. Brand vs. chrome</H2>
            <P>
              Your logo is pills, gradients and saturated color. Notion is
              hairlines, 3px corners and muted ink. Both are right — they just
              govern different halves of the product.
            </P>
            <P>
              <span className="font-medium">The split:</span> Notion owns the
              chrome — sidebar, menus, forms, settings. The brand owns the
              canvas and the landing page. And the three pills in your mark are
              already a legend: purple routes, blue services, amber data.
            </P>

            <Block className="my-5">
              <div className="flex items-center gap-4 rounded-lg bg-sunken p-4">
                <Logo className="size-14 shrink-0 text-primary" />
                <div className="flex flex-1 flex-wrap gap-3">
                  {[
                    ["purple", "#6B46F5", "routes"],
                    ["blue", "#1270F8", "services"],
                    ["amber", "#FAC249", "data"],
                  ].map(([name, hex, role]) => (
                    <div key={name} className="flex items-center gap-2">
                      <span
                        className="h-7 w-2 rounded-full"
                        style={{ background: hex }}
                      />
                      <span className="leading-tight">
                        <span className="block font-mono text-[12px] text-primary">
                          {hex}
                        </span>
                        <span className="block text-[11px] text-tertiary">
                          {role}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </Block>

            <Block className="my-5">
              <CanvasPreview />
            </Block>

            <Block className="my-4">
              <Callout icon="🎨" tone="purple">
                A node is a Notion-shaped card — 6px radius, hairline, card
                shadow — with a brand <em>pill</em> as its type marker. That
                gets your logo into the product without turning the whole UI
                into gradients.
              </Callout>
            </Block>

            {/* ---------------------------------------------------------- */}
            <H2>1. Ink, not gray</H2>
            <P>
              The foundation is <Code>#37352F</Code> — a brown-black. Every gray
              in the product is that same ink at low alpha, which is why the
              surfaces read as paper instead of glass. A cool neutral gray
              anywhere in this app is a bug.
            </P>

            <Block className="my-4 space-y-1.5">
              {inks.map(([name, cls, use]) => (
                <div
                  key={name}
                  className="notion-hover flex items-baseline gap-3 px-2 py-1.5"
                >
                  <span
                    className={`w-24 shrink-0 text-[15px] font-medium ${cls}`}
                  >
                    {name}
                  </span>
                  <span className="text-[13px] text-tertiary">{use}</span>
                </div>
              ))}
            </Block>

            {/* ---------------------------------------------------------- */}
            <H2>2. Surfaces</H2>
            <P>
              Depth comes from tint, not from shadow. Shadows are reserved for
              things that genuinely float — popovers and modals.
            </P>

            <Block className="my-4 space-y-1.5">
              {surfaces.map(([name, cls, use]) => (
                <div key={name} className="flex items-center gap-3">
                  <div
                    className={`size-10 shrink-0 rounded-md shadow-[inset_0_0_0_1px_var(--border)] ${cls}`}
                  />
                  <div className="min-w-0">
                    <div className="font-mono text-[13px] text-primary">
                      {name}
                    </div>
                    <div className="text-[13px] text-tertiary">{use}</div>
                  </div>
                </div>
              ))}
            </Block>

            {/* ---------------------------------------------------------- */}
            <H2>3. Type</H2>
            <P>
              Inter, tightening as it gets bigger. Body sits at 16px with 1.5
              line-height and never drops below 14px for anything a user reads.
            </P>

            <Block className="my-4 space-y-3">
              <div className="text-[40px] font-bold leading-[1.2] tracking-[-0.022em] text-primary">
                Page title · 40/700
              </div>
              <div className="text-[30px] font-semibold leading-[1.3] tracking-[-0.015em] text-primary">
                Heading 1 · 30/600
              </div>
              <div className="text-[24px] font-semibold leading-[1.3] tracking-[-0.01em] text-primary">
                Heading 2 · 24/600
              </div>
              <div className="text-[20px] font-semibold leading-[1.3] text-primary">
                Heading 3 · 20/600
              </div>
              <div className="text-[16px] leading-[1.5] text-primary">
                Body · 16/400 — the default for prose in the reading column.
              </div>
              <div className="text-[14px] leading-[1.5] text-secondary">
                UI · 14/400 — sidebar rows, buttons, inputs, table cells.
              </div>
              <div className="text-[12px] leading-[1.4] font-medium text-tertiary">
                Caption · 12/500 — section labels and metadata.
              </div>
              <div className="font-mono text-[13px] text-primary">
                Mono · 13px JetBrains Mono — file paths, symbols, diffs.
              </div>
            </Block>

            {/* ---------------------------------------------------------- */}
            <H2>4. Controls</H2>
            <P>
              Buttons are quiet. <Code>secondary</Code> is the workhorse — a
              hairline box on the page. <Code>primary</Code> is rationed to one
              per view, and most actions are <Code>ghost</Code>.
            </P>

            <Block className="my-4 flex flex-wrap items-center gap-2">
              <Button variant="primary">
                Generate map <ArrowRight className="size-3.5" />
              </Button>
              <Button variant="secondary">Open PR</Button>
              <Button variant="ghost">Cancel</Button>
              <Button variant="danger">
                <Trash2 className="size-3.5" /> Disconnect
              </Button>
              <IconButton aria-label="Copy">
                <Copy className="size-4" />
              </IconButton>
            </Block>

            <Block className="my-4 max-w-sm">
              <Input placeholder="github.com/you/trendstack-api" />
            </Block>

            {/* ---------------------------------------------------------- */}
            <H2>5. Hover is the interface</H2>
            <P>
              Nothing shows chrome until the cursor is near it. Rows fill at
              20ms; handles, menus and add-buttons fade in at 100ms. Hover the
              rows below — and the left gutter of any block on this page.
            </P>

            <Block className="my-4 space-y-px">
              {["routes/auth.py", "services/billing.py", "models/user.py"].map(
                (f) => (
                  <div
                    key={f}
                    className="reveal-parent notion-hover flex h-8 items-center gap-2 px-2"
                  >
                    <span className="font-mono text-[13px] text-secondary">
                      {f}
                    </span>
                    <span className="reveal ml-auto flex gap-0.5">
                      <IconButton size="sm" aria-label="Copy">
                        <Copy className="size-3.5" />
                      </IconButton>
                      <IconButton size="sm" aria-label="Open">
                        <ArrowRight className="size-3.5" />
                      </IconButton>
                    </span>
                  </div>
                ),
              )}
            </Block>

            {/* ---------------------------------------------------------- */}
            <H2>6. Color, used sparingly</H2>
            <P>
              Nine hues, each with a text value and a background tint. They
              label things — a node type, a kind of change — they never
              decorate.
            </P>

            <Block className="my-4 flex flex-wrap gap-1.5">
              {accents.map(([name, bg]) => (
                <div
                  key={name}
                  className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-[13px] text-secondary hover:bg-hover"
                >
                  <span className={`size-3 rounded-xs ${bg}`} />
                  {name}
                </div>
              ))}
            </Block>

            <Block className="my-4 space-y-2">
              <Callout icon="🟢" tone="green">
                Route added — <Code>POST /v1/billing/webhook</Code>
              </Callout>
              <Callout icon="⚠️" tone="yellow">
                This node has no tests covering it.
              </Callout>
              <Callout icon="🔴" tone="red">
                Circular import between <Code>services</Code> and{" "}
                <Code>models</Code>.
              </Callout>
            </Block>

            {/* ---------------------------------------------------------- */}
            <H2>7. Radius &amp; elevation</H2>
            <P>
              Radii stay small — 3px is the hover-chip value and the single most
              recognizable dimension in the system. Shadows are layered
              hairline + soft + wide, never one big blur.
            </P>

            <Block className="my-4 flex flex-wrap gap-3">
              {[
                ["card", "shadow-card"],
                ["popover", "shadow-popover"],
                ["modal", "shadow-modal"],
              ].map(([name, cls]) => (
                <div
                  key={name}
                  className={`grid h-20 w-36 place-items-center rounded-lg bg-raised text-[13px] text-secondary ${cls}`}
                >
                  {name}
                </div>
              ))}
            </Block>

            {/* ---------------------------------------------------------- */}
            <H2>8. Code</H2>
            <Block className="my-4">
              <pre className="overflow-x-auto rounded-sm bg-code p-4 font-mono text-[13px] leading-[1.6] text-primary">
                <code>{`@router.post("/v1/billing/webhook")
async def stripe_webhook(request: Request):
    event = verify_signature(await request.body())
    await handle(event)
    return {"ok": True}`}</code>
              </pre>
            </Block>

            <Block className="mt-12">
              <Callout icon="🧠" tone="gray">
                <span className="font-medium">The one-line rule:</span> if a
                surface needs a border to be legible, the spacing is wrong.
              </Callout>
            </Block>
          </Column>
        </div>
      </main>
    </div>
  );
}
