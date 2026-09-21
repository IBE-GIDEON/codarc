# Codarc

Repo → architecture diagram → click a node and describe a change → agent edits
the files behind that node → opens a PR. Aimed at solo founders who built with
AI and don't fully understand their own codebase.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
lucide-react. Tailwind v4 is CSS-first — there is **no `tailwind.config.ts`**.
Theme lives in `@theme inline` inside `src/app/globals.css`.

## Design language — read `DESIGN.md` before writing any UI

It should feel like Notion. Not "inspired by" — like Notion. The short version:

- **Ink, not gray.** `#37352F` at varying alpha. Never a cool gray, never a
  Tailwind default palette color (`zinc-*`, `gray-*`, `slate-*`).
- **Hover is the interface.** `.notion-hover` on every row; `.reveal-parent` /
  `.reveal` for chrome that appears on approach.
- **Space, not lines.** If a surface needs a border to be legible, fix the
  spacing.
- **Small radii.** 3px chips, 6px cards, 8px modals. Never 12px+, never pills.
- **Compact chrome, generous content.** 28px controls, 16/1.5 prose in a 708px
  column.
- **20ms hover, 100ms reveal, nothing bounces.**

Use semantic tokens only — `bg-page`, `bg-hover`, `text-secondary`,
`shadow-popover`, `rounded-sm`. Never hard-code a hex, radius, or shadow in a
component.

**Brand vs. chrome.** Notion governs the app chrome; the brand governs the
canvas and the marketing pages. So gradients, glows and the saturated triad are
allowed in `src/components/landing/*` and on the canvas, and nowhere else.
Everything ruled out below refers to the chrome: glassmorphism, pill badges,
coloured shadows, entrance animations, more than one primary button per view.

Brand triad (sampled from the logo and backdrop art) doubles as the canvas
legend: purple = doors, blue = logic, amber = data, green = screens.

## Writing for the customer

Codarc's users mostly **cannot read code** — they shipped an app with AI and
have never opened the files. Every string that reaches the screen says what a
thing *does*, not what it is called. "Where a request arrives from the outside
world", not "HTTP route handler". `src/lib/humanize.ts` is where code-shaped
names become sentences; put new copy through it rather than inlining jargon.

## Layout

`src/app/globals.css` — all tokens
`src/lib/graph.ts` — RepoMap / GraphNode types shared by analyzer and canvas
`src/lib/github.ts` — read-only GitHub fetching, typed errors with plain hints
`src/lib/analyze.ts` — the engine: parse, build the graph, lay it out
`src/lib/change.ts` — Claude Opus 5 drafts an edit; refuses rather than half-applies
`src/lib/diff.ts` — minimal line differ for the preview
`src/lib/humanize.ts` — code-shaped names to plain English
`src/app/api/map/route.ts` — GET /api/map?repo=owner/name
`src/app/api/change/route.ts` — POST, drafts a change and returns a diff
`src/lib/access.ts` — who may read or change a repo: GitHub's own answer, or the Studio owner's
`src/lib/drafts.ts` — drafted changes, kept in the database between draft and send
`src/lib/payments.ts` — Lemon Squeezy: checkout, webhook, billing page. The only file that knows the provider
`src/proxy.ts` — signed-in visitors skip the landing page for `/dashboard`
`src/app/dashboard` — home once signed in: recent maps, your GitHub projects
`src/app/r/[owner]/[repo]` — the workspace
`src/components/workspace/*` — canvas, inspector, sidebar
`src/components/landing/*` — marketing only; brand rules apply here
`src/components/ui/*` — primitives (button, input, callout)
`src/lib/cn.ts` — `cn()` = clsx + tailwind-merge

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
