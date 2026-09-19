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

Ruled out: gradients, glassmorphism, pill badges, colored shadows, entrance
animations, more than one primary button per view.

## Layout

`src/app/globals.css` — all tokens
`src/components/ui/*` — primitives (button, input, callout)
`src/components/page-chrome.tsx` — TopBar, Column, PageHeader, Block, H2, P
`src/components/sidebar.tsx` — 240px nav
`src/lib/cn.ts` — `cn()` = clsx + tailwind-merge

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
