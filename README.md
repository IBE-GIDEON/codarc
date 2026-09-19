# Codarc

Point it at a repository and it draws the architecture. Click a box, say what
should change, get a pull request.

Built for solo founders who shipped an app with AI and have never opened the
code. Every label on screen says what a thing *does*, not what it is called.

---

## Running it

```bash
npm install
npm run dev
```

Then open http://localhost:3000 and paste a public GitHub repository — no
account needed. Try `tiangolo/full-stack-fastapi-template` or
`vercel/ai-chatbot`.

```bash
npm run build && npm run start   # production
```

## What it reads today

| Stack | Finds |
|---|---|
| FastAPI | routes and their router prefixes, Pydantic/SQLModel shapes |
| Flask | `@route` decorators with methods, blueprint prefixes |
| Django + DRF | `urlpatterns`, `router.register`, models, serializers |
| Next.js | App Router pages and route handlers, Pages Router API |
| Express / Hono | `app.get(...)` style routes |
| Prisma · Drizzle · Mongoose · TypeORM · Zod | data shapes |

Everything is heuristic — regex and an import graph, no full AST parse. It is
deliberately tuned to be *readable* rather than exhaustive: the canvas shows
the busiest pieces and the sidebar says how many were left out.

## Configuration

Copy `.env.example` to `.env.local`.

- `GITHUB_TOKEN` — optional. Anonymous GitHub API access is capped at 60
  requests an hour per IP, and each mapped repository costs two. A token with
  no scopes (public read) lifts that to 5,000. Set this before showing anyone.
- `ANTHROPIC_API_KEY` — required for **Draft the change**. Without it the map
  still works and the button returns a clear "not set up yet" message. Drafting
  uses Claude Opus 5 at high effort; a typical change is a few cents.

## Deploying

Works on any Node host. On Vercel, note that mapping a large repository can run
20–40 seconds, so the function needs a 60s limit — that means the Pro plan, or
lower `MAX_FILES` in `src/lib/analyze.ts`.

## Drafting a change

Click a box, describe the change in ordinary words, and Codarc reads the file
behind that box (plus what it imports), asks Claude Opus 5 for the smallest
correct edit, and shows you a real diff.

Edits come back as exact find/replace pairs and are **applied server-side
before you see anything**. If any snippet doesn't match exactly once, the whole
proposal is refused rather than half-applied — a wrong edit shown as a clean
diff is the worst possible failure here.

## What is not built yet

- **Sending the change.** Drafting works; turning the diff into a pull request
  does not. That needs a GitHub App install for write access, and it's the
  next milestone.
- **Private repositories**, for the same reason.
- **Accounts and billing.** Pricing is on the landing page; nothing charges.

## Notes

`CLAUDE.md` has the working rules. `DESIGN.md` is the design language — read it
before touching UI. `/design` renders it as a live page.
