# Codarc — Design Language

**The whole thing in one sentence:** it should feel like Notion. Not
"inspired by Notion" — like Notion.

Everything below is enforced by tokens in `src/app/globals.css`. If a component
hard-codes a hex, a radius, or a shadow, that's a bug.

---

## The five rules

1. **Ink, not gray.** The foundation is `#37352F` — a brown-black. Every gray
   is that ink at low alpha. A cool neutral gray (`#6B7280`, `zinc-500`,
   anything from Tailwind's default palette) anywhere in this app is wrong. It
   is the single thing that makes a UI read as "paper" instead of "glass".

2. **Hover is the interface.** Every row, icon and block is a hover target that
   fills with ink at 5.5% in 20ms. Secondary chrome — drag handles, row
   actions, add buttons — is invisible until the cursor is nearby, then fades
   in at 100ms. Use `.notion-hover` and `.reveal-parent` / `.reveal`.

3. **Separate with space, not lines.** Borders are ink at 9% and are close to
   invisible by design. If a surface needs a border to be legible, the spacing
   is wrong. Shadows are reserved for things that genuinely float.

4. **Small radii.** 3px is the hover-chip value and the most recognizable
   dimension in the system. Cards get 6px, modals 8px. Nothing gets 12px+
   and nothing is pill-shaped.

5. **Compact chrome, generous content.** Controls are 24/28/32px tall. Prose is
   16px at 1.5 line-height inside a 708px column that never widens.

---

## Tokens

### Ink

| Token | Light | Dark | Use |
|---|---|---|---|
| `text-primary` | `#37352F` | `rgb(255 255 255 / .81)` | Headings, body, anything read |
| `text-secondary` | ink 65% | white 46% | Sidebar rows, labels, metadata |
| `text-tertiary` | ink 45% | white 28% | Placeholders, section labels, resting icons |
| `text-ghost` | ink 28% | white 18% | Drag handles, dividers, disabled |

Dark mode never uses pure white text. It sits at 81%.

### Surfaces

| Token | Light | Dark |
|---|---|---|
| `bg-page` | `#FFFFFF` | `#191919` |
| `bg-sidebar` | `#F7F7F5` | `#202020` |
| `bg-raised` | `#FFFFFF` | `#252525` |
| `bg-code` | `#F7F6F3` | `#232323` |
| `bg-hover` | ink 5.5% | white 5.5% |
| `bg-active` | ink 9% | white 10% |

### Accent

`#2383E2` — Notion blue. One primary button per view, maximum.

### Semantic hues

Nine: gray, brown, orange, yellow, green, blue, purple, pink, red. Each has a
text value (`text-c-green`) and a background tint (`bg-c-green-bg`). They
**label** things — a node type, a kind of change. They never decorate.

### Type

Inter, tightening as it grows.

| Role | Size / weight | Tracking |
|---|---|---|
| Page title | 40 / 700 | -0.022em |
| H1 | 30 / 600 | -0.015em |
| H2 | 24 / 600 | -0.01em |
| H3 | 20 / 600 | 0 |
| Body | 16 / 400, lh 1.5 | 0 |
| UI | 14 / 400 | 0 |
| Caption | 12 / 500 | 0 |
| Mono | 13, JetBrains Mono | 0 |

Nothing a user reads goes below 14px.

### Radius

`xs 2` · `sm 3` · `md 4` · `lg 6` · `xl 8` · `2xl 10`

### Elevation

Layered hairline + soft + wide. Never one big blur.

- `shadow-card` — resting cards
- `shadow-popover` — menus, dropdowns, the node inspector
- `shadow-modal` — dialogs

### Motion

Split by surface, like everything else.

**App chrome — restrained.** You are working in it all day.

- Hover fill: **20ms ease-in**. Fast enough to feel like the surface reacts to
  the cursor rather than animating.
- Reveal / fade: **100ms ease-in**.
- Transform / layout: **150–200ms**, `--ease-notion`.
- No entrance animations. The one exception is the canvas gliding to a node you
  picked from the sidebar (**440ms**, `--ease-soft`), and only when that node
  was actually off screen.

**Marketing — one gesture, used everywhere.** Content settles up into place as
it scrolls in: 14px rise, 620ms, `--ease-soft`, via `<Reveal>`. Stagger
siblings by 70–90ms and never past ~240ms total. It fires **once** — nothing
re-animates on the way back up. Cards use `.lift` (2px, 220ms) on hover.

Nothing bounces. Nothing springs. Nothing overshoots — `--ease-soft` is a pure
decelerate, so motion reads as weight settling.

Everything above is off entirely under `prefers-reduced-motion: reduce`, which
is enforced globally in `globals.css`. Content is visible without JavaScript.

---

## Layout

- Sidebar **240px**, `bg-sidebar`, no border — the tint edge is the separation.
- Sidebar rows **27px** tall, 3px radius, 14px text.
- Top bar **45px**, breadcrumb left, quiet icon buttons right. No border.
- Reading column **708px** (`max-w-reading`), 96px side padding on desktop.

### The chevron swap

In the sidebar, the disclosure chevron **replaces** the row icon on hover — it
does not sit beside it. This is the detail most Notion clones get wrong, and
it's implemented in `src/components/sidebar.tsx`.

---

## Identity

The mark and the name travel together as `<Wordmark>` — `sm` (24px mark / 15px
text) inside the app, `md` (32 / 19) on marketing and in the sidebar header,
`lg` (36 / 22) where it needs to carry a page on its own. Don't hand-assemble
the pair; the optical relationship between mark and name is fixed.

The favicon is `src/app/icon.svg` — the mark on near-black, since the chevron
is white and needs its own ground.

## What this rules out

*In the app chrome.* No gradient buttons. No glassmorphism. No pill badges. No
coloured drop shadows. No 12px+ radii. No cool grays. No entrance animations.
No bordered cards where spacing would do. No more than one primary button per
view.

The marketing pages and the canvas are governed by the brand instead, so the
hero glow, the highlight pill and the scroll reveals are deliberate there and
wrong anywhere else.

---

## Applying it to Codarc

- **Diagram nodes** are Notion blocks that happen to be positioned: 6px radius,
  `shadow-card`, hover fill, hue-coded by node type using the semantic palette.
- **The node inspector** is a popover, not a drawer with a header bar —
  `shadow-popover`, 8px radius.
- **Click-to-edit** should read as writing in a doc, not as filling in a form:
  a plain textarea on a sunken tint, no label, placeholder as the only prompt.
- **Diffs / PRs** use `bg-code` with the green and red tints from the semantic
  palette.
