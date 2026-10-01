import type { GraphNode, NodeKind, RepoMap } from "@/lib/graph";
import { plural, screenTitle } from "@/lib/humanize";

/**
 * Your app, drawn the way its owner thinks about it — not the way its files
 * are arranged.
 *
 * The same picture at three depths, and you only ever see one:
 *
 *   app    what you built    the parts of the app, each listing its pages
 *   area   one part of it    the pages in that part, and what they do
 *   page   one page          what happens on it, and where it leads
 *
 * Every depth is the same drawing — cards, elbows down for structure, curves
 * across for the links people click — because a new picture at every step is
 * a new thing to learn at every step. What changes is only what's on it, and
 * no depth holds more than a screenful.
 *
 * The shape comes from the way design tools plan a site before it's built —
 * FlowMapp, Whimsical, a whiteboard — read backwards out of code that's
 * already written.
 */

export const CARD_W = 212;
const HEAD_H = 46;
const NOTE_H = 17;
const ROW_H = 23;
const CARD_PAD = 10;
const SKETCH_H = 64;
const GAP_X = 52;
const GAP_Y = 92;
const MAX_ROWS = 6;
/** How many cards sit side by side before a row wraps. */
const PER_ROW = 4;
/** Caps, so no single depth can turn into a wall. */
const MAX_PIECES = 8;
const MAX_LINKS = 4;
const MAX_DEEPER = 8;

/** Where you are. Each depth answers a question the last one raised. */
export type Level =
  | { at: "app" }
  | { at: "area"; key: string }
  | { at: "page"; id: string };

export const APP_LEVEL: Level = { at: "app" };

export function sameLevel(a: Level, b: Level): boolean {
  if (a.at !== b.at) return false;
  if (a.at === "area" && b.at === "area") return a.key === b.key;
  if (a.at === "page" && b.at === "page") return a.id === b.id;
  return true;
}

/** One line inside a card. */
export type Block = {
  id: string;
  title: string;
  kind: NodeKind;
  /** Clicking this row goes deeper instead of opening the piece. */
  into?: Level;
};

export type Card = {
  id: string;
  title: string;
  /** The small mono chip under the title — an address, or nothing. */
  path: string;
  /** One line of plain English under the title. */
  note?: string;
  /** Which of the four kinds this is, when it is one of them. */
  kind?: NodeKind;
  node?: GraphNode;
  blocks: Block[];
  /** Blocks that didn't fit. */
  more: number;
  /** Everything inside, counted even when the card is collapsed. */
  inside: number;
  /** Clicking the card goes here. Without it, the card is simply opened. */
  into?: Level;
  /** A card with nothing listed gets a sketch rather than an empty box. */
  sketch?: boolean;
  /**
   * Which part of the app this card belongs to. One colour per part, kept
   * the same at every depth, so stepping inside never loses your place.
   */
  branch: number;
  depth: number;
  x: number;
  y: number;
  h: number;
};

/** A line someone can click their way along. */
export type Journey = { from: string; to: string };

export type Sitemap = {
  cards: Card[];
  /** The structure: which card sits under which. */
  branches: { from: string; to: string }[];
  journeys: Journey[];
  width: number;
  height: number;
  /** The name of what you're looking at. */
  title: string;
  /** What this depth answers, in one line. */
  hint: string;
  /** The way back out. */
  up: Level | null;
  /** Whether cards here can collapse to plain structure. */
  collapsible: boolean;
};

const tidy = (path: string) => path.replace(/\/+$/, "") || "/";

/** The first part of an address: "/dashboard/billing" gives "dashboard". */
const topSeg = (path: string) => tidy(path).split("/").filter(Boolean)[0] ?? "";

/** The card one level up: the longest other address this one sits inside. */
function parentOf(path: string, all: string[]): string | null {
  const me = tidy(path);
  if (me === "/") return null;
  let best: string | null = null;
  for (const other of all) {
    const them = tidy(other);
    if (them === me) continue;
    if (them === "/" || me.startsWith(`${them}/`)) {
      if (!best || them.length > best.length) best = them;
    }
  }
  return best;
}

function titleCase(words: string): string {
  return words
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/** What each kind is, in a handful of words. */
const WHAT_IT_IS: Record<NodeKind, string> = {
  screen: "A page people open",
  door: "Where a request arrives",
  logic: "Work behind the scenes",
  data: "Information you keep",
};

/* ------------------------------------------------------------------ layout */

type Seed = Omit<Card, "depth" | "x" | "y" | "h"> & { parent: string | null };

function heightOf(seed: Seed, detailed: boolean): number {
  let h = HEAD_H;
  if (seed.note) h += NOTE_H;
  if (seed.blocks.length) h += seed.blocks.length * ROW_H + CARD_PAD;
  else if (detailed && seed.sketch) h += SKETCH_H;
  return h;
}

/**
 * Cards under their parents, left to right, parents centred over them.
 *
 * A parent with ten children would stretch three screens wide and force the
 * map open at 40%, where nothing can be read — so a long row of plain cards
 * wraps onto a second line, the way a shelf does.
 */
function layout(seeds: Seed[], detailed: boolean) {
  const cards: Card[] = seeds.map((seed) => ({
    ...seed,
    depth: 0,
    x: 0,
    y: 0,
    h: heightOf(seed, detailed),
  }));
  const byId = new Map(cards.map((c) => [c.id, c]));
  const parentById = new Map(seeds.map((s) => [s.id, s.parent]));

  const branches: { from: string; to: string }[] = [];
  const childrenOf = new Map<string, Card[]>();
  const roots: Card[] = [];

  for (const card of cards) {
    const parent = parentById.get(card.id);
    const above = parent ? byId.get(parent) : undefined;
    if (above) {
      branches.push({ from: above.id, to: card.id });
      const list = childrenOf.get(above.id) ?? [];
      list.push(card);
      childrenOf.set(above.id, list);
    } else {
      roots.push(card);
    }
  }

  const setDepth = (card: Card, depth: number) => {
    card.depth = depth;
    for (const kid of childrenOf.get(card.id) ?? []) setDepth(kid, depth + 1);
  };
  for (const root of roots) setDepth(root, 0);

  const subRow = new Map<string, number>();
  let cursor = 0;
  const walk = (card: Card): number => {
    const kids = childrenOf.get(card.id) ?? [];
    if (!kids.length) {
      card.x = cursor;
      cursor += CARD_W + GAP_X;
      subRow.set(card.id, 0);
      return card.x;
    }

    const allLeaves = kids.every((k) => !(childrenOf.get(k.id) ?? []).length);
    if (allLeaves && kids.length > PER_ROW) {
      const start = cursor;
      kids.forEach((kid, i) => {
        kid.x = start + (i % PER_ROW) * (CARD_W + GAP_X);
        subRow.set(kid.id, Math.floor(i / PER_ROW));
      });
      const across = Math.min(kids.length, PER_ROW);
      cursor = start + across * (CARD_W + GAP_X);
      card.x = start + ((across - 1) * (CARD_W + GAP_X)) / 2;
    } else {
      const centres = kids.map(walk);
      card.x = (centres[0] + centres[centres.length - 1]) / 2;
    }
    subRow.set(card.id, 0);
    return card.x;
  };
  for (const root of roots) walk(root);

  // Each band is as tall as it needs to be, wrapped lines included.
  const rowTop = new Map<number, number>();
  const tallestAt = new Map<number, number>();
  const deepest = Math.max(0, ...cards.map((c) => c.depth));
  let y = 0;
  for (let depth = 0; depth <= deepest; depth++) {
    rowTop.set(depth, y);
    const here = cards.filter((c) => c.depth === depth);
    const tallest = Math.max(0, ...here.map((c) => c.h));
    tallestAt.set(depth, tallest);
    const lines = 1 + Math.max(0, ...here.map((c) => subRow.get(c.id) ?? 0));
    y += lines * tallest + (lines - 1) * 20 + GAP_Y;
  }
  for (const card of cards) {
    const band = rowTop.get(card.depth) ?? 0;
    const tallest = tallestAt.get(card.depth) ?? card.h;
    card.y = band + (subRow.get(card.id) ?? 0) * (tallest + 20);
  }

  return {
    cards,
    branches,
    width: Math.max(1, ...cards.map((c) => c.x + CARD_W)),
    height: Math.max(1, ...cards.map((c) => c.y + c.h)),
  };
}

/* ------------------------------------------------------------------- parts */

export type Area = {
  key: string;
  title: string;
  pages: GraphNode[];
  /** Its colour, held across every depth. */
  branch: number;
};

/**
 * The parts of the app: one per section of the site, named the way its own
 * front page names it. Someone who built a dashboard and a billing page sees
 * "Dashboard" and "Billing", not a folder tree.
 */
export function areasOf(map: RepoMap): Area[] {
  const pages = map.nodes.filter((n) => n.kind === "screen");
  const groups = new Map<string, GraphNode[]>();
  for (const page of pages) {
    const key = topSeg(page.code);
    const list = groups.get(key) ?? [];
    list.push(page);
    groups.set(key, list);
  }

  const ordered = [...groups].sort((a, b) => {
    // Home first — it's where everyone starts — then the biggest parts.
    if (a[0] === "") return -1;
    if (b[0] === "") return 1;
    return b[1].length - a[1].length || a[0].localeCompare(b[0]);
  });

  return ordered.map(([key, list], i) => {
    // Named the way a person would name that corner of the app — "Log In",
    // not "login" — with the section's own front page as the fallback.
    const front = list.find((p) => tidy(p.code) === (key ? `/${key}` : "/"));
    const inside = [...list].sort(
      (a, b) =>
        tidy(a.code).length - tidy(b.code).length || a.title.localeCompare(b.title),
    );
    return {
      key,
      title: screenTitle(`/${key}`) || front?.title || titleCase(key),
      pages: inside,
      branch: i + 1,
    };
  });
}

/**
 * Which of those are really parts. A section holding one page is that page —
 * giving it a card of its own, with itself listed inside it, is a lid over
 * nothing. Those stay loose at the top, beside the parts.
 */
function sectionsOf(map: RepoMap) {
  const areas = areasOf(map);
  return {
    sections: areas.filter((a) => a.pages.length >= 2),
    loose: areas
      .filter((a) => a.pages.length < 2)
      .flatMap((a) => a.pages.map((page) => ({ page, branch: a.branch }))),
  };
}

/** The part a page belongs to, when its part is one worth having. */
export function partOf(map: RepoMap, pageId: string): Area | null {
  if (!hasParts(map)) return null;
  return (
    sectionsOf(map).sections.find((a) => a.pages.some((p) => p.id === pageId)) ?? null
  );
}

/**
 * Whether this app has parts worth a level of their own. Four pages in four
 * parts is the same four pages with a lid on — an app like that skips the
 * lid and opens straight onto its pages.
 */
export function hasParts(map: RepoMap): boolean {
  return sectionsOf(map).sections.length >= 2;
}

/** What a page leans on, doors first — those are the moments something happens. */
function piecesOf(map: RepoMap, nodeId: string, byId: Map<string, GraphNode>) {
  const out: GraphNode[] = [];
  for (const e of map.edges) {
    if (e.from !== nodeId || e.kind === "opens") continue;
    const target = byId.get(e.to);
    if (!target || out.some((n) => n.id === target.id)) continue;
    out.push(target);
  }
  const order: NodeKind[] = ["door", "data", "logic", "screen"];
  return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
}

/**
 * A card per page, nested the way their addresses nest, each listing what
 * the page actually does. The same cards serve a small app's whole map and
 * one part of a big one.
 */
function pageSeeds(
  map: RepoMap,
  pages: GraphNode[],
  branchOf: (page: GraphNode) => number,
  detailed: boolean,
): Seed[] {
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const paths = pages.map((p) => tidy(p.code));
  const idByPath = new Map(pages.map((p) => [tidy(p.code), p.id]));

  return pages.map((page) => {
    const inside = piecesOf(map, page.id, byId);
    const shown = detailed ? inside.slice(0, MAX_ROWS) : [];
    const above = parentOf(tidy(page.code), paths);
    return {
      id: page.id,
      title: page.title,
      path: tidy(page.code),
      node: page,
      kind: "screen" as NodeKind,
      blocks: shown.map((n) => ({ id: n.id, title: n.title, kind: n.kind })),
      more: detailed ? Math.max(0, inside.length - shown.length) : 0,
      inside: inside.length,
      into: { at: "page", id: page.id } as Level,
      sketch: true,
      branch: branchOf(page),
      parent: (above && idByPath.get(above)) || null,
    };
  });
}

/* ------------------------------------------------------------------- depths */

/** What you built: the parts of the app, each listing the pages inside it. */
function buildApp(map: RepoMap, detailed: boolean): Sitemap {
  const areas = areasOf(map);
  const pages = map.nodes.filter((n) => n.kind === "screen");
  const name = titleCase(map.repo);

  const seeds: Seed[] = [
    {
      id: "app",
      title: name,
      path: `${map.owner}/${map.repo}`,
      note: `${plural(pages.length, "page")} in ${plural(areas.length, "part")}`,
      blocks: [],
      more: 0,
      inside: pages.length,
      branch: 0,
      parent: null,
    },
  ];

  /*
   * A small app doesn't have parts worth naming — it has pages. Showing it
   * four cards that each hold one page is a step you have to click through
   * to learn nothing.
   */
  if (!hasParts(map)) {
    const branchOf = (page: GraphNode) =>
      areas.find((a) => a.pages.some((p) => p.id === page.id))?.branch ?? 0;
    const tree = pageSeeds(map, pages, branchOf, detailed);
    for (const seed of tree) if (!seed.parent) seed.parent = "app";

    const laid = layout([...seeds, ...tree], detailed);
    const structural = new Set(laid.branches.map((b) => `${b.from}->${b.to}`));
    const here = new Set(tree.map((s) => s.id));
    const links: Journey[] = [];
    for (const e of map.edges) {
      if (e.kind !== "opens") continue;
      if (!here.has(e.from) || !here.has(e.to)) continue;
      if (structural.has(`${e.from}->${e.to}`)) continue;
      links.push({ from: e.from, to: e.to });
    }

    return {
      ...laid,
      journeys: links,
      title: name,
      hint: "Every page in your app. Click one to see what happens on it.",
      up: null,
      collapsible: true,
    };
  }

  const { sections, loose } = sectionsOf(map);
  const areaOfNode = new Map<string, string>();

  // The pages that aren't part of anything sit at the top beside the parts,
  // exactly as they do in the app itself.
  const singles = pageSeeds(
    map,
    loose.map((l) => l.page),
    (page) => loose.find((l) => l.page.id === page.id)?.branch ?? 0,
    detailed,
  );
  for (const single of singles) {
    single.parent = "app";
    areaOfNode.set(single.id, single.id);
  }

  for (const area of sections) {
    for (const page of area.pages) areaOfNode.set(page.id, `area:${area.key}`);

    const shown = detailed ? area.pages.slice(0, MAX_ROWS) : [];
    seeds.push({
      id: `area:${area.key}`,
      title: area.title,
      path: area.key ? `/${area.key}` : "/",
      note: plural(area.pages.length, "page"),
      blocks: shown.map((page) => ({
        id: page.id,
        title: page.title,
        kind: "screen" as NodeKind,
        into: { at: "page", id: page.id } as Level,
      })),
      more: detailed ? Math.max(0, area.pages.length - shown.length) : 0,
      inside: area.pages.length,
      into: { at: "area", key: area.key },
      sketch: true,
      branch: area.branch,
      parent: "app",
    });
  }

  // Where one part of the app hands you to another.
  const seen = new Set<string>();
  const journeys: Journey[] = [];
  for (const e of map.edges) {
    if (e.kind !== "opens") continue;
    const from = areaOfNode.get(e.from);
    const to = areaOfNode.get(e.to);
    if (!from || !to || from === to) continue;
    const key = `${from}->${to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    journeys.push({ from, to });
  }

  // Home leads, then the parts, then the pages that stand on their own.
  const [head, ...parts] = seeds;
  const home = singles.filter((s) => s.path === "/");
  const rest = singles.filter((s) => s.path !== "/");

  return {
    ...layout([head, ...home, ...parts, ...rest], detailed),
    journeys,
    title: name,
    hint: "Everything you built, in parts. Click a part to go inside it.",
    up: null,
    collapsible: true,
  };
}

/** One part of the app: its pages, laid out the way their addresses nest. */
function buildArea(map: RepoMap, key: string, detailed: boolean): Sitemap {
  const areas = areasOf(map);
  const area = areas.find((a) => a.key === key);
  if (!area) return buildApp(map, detailed);

  const seeds = pageSeeds(map, area.pages, () => area.branch, detailed);

  // Several front pages and nothing above them: give the part a head, so it
  // reads as one thing rather than three unrelated trees.
  const roots = seeds.filter((s) => !s.parent);
  if (roots.length > 1) {
    const head = `area:${area.key}`;
    for (const root of roots) root.parent = head;
    seeds.unshift({
      id: head,
      title: area.title,
      path: area.key ? `/${area.key}` : "/",
      note: plural(area.pages.length, "page"),
      blocks: [],
      more: 0,
      inside: area.pages.length,
      branch: area.branch,
      parent: null,
    });
  }

  const laid = layout(seeds, detailed);
  const structural = new Set(laid.branches.map((b) => `${b.from}->${b.to}`));
  const here = new Set(seeds.map((s) => s.id));
  const journeys: Journey[] = [];
  for (const e of map.edges) {
    if (e.kind !== "opens") continue;
    if (!here.has(e.from) || !here.has(e.to)) continue;
    if (structural.has(`${e.from}->${e.to}`)) continue;
    journeys.push({ from: e.from, to: e.to });
  }

  return {
    ...laid,
    journeys,
    title: area.title,
    hint: "The pages in this part. Click one to see what happens on it.",
    up: APP_LEVEL,
    collapsible: true,
  };
}

/**
 * One page: what happens when somebody uses it, and where it can take them.
 * This is the depth a change gets described at, so it holds a handful of
 * cards and no lists.
 */
function buildPage(map: RepoMap, id: string, detailed: boolean): Sitemap {
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const page = byId.get(id);
  if (!page) return buildApp(map, detailed);

  const areas = areasOf(map);
  const area = areas.find((a) => a.pages.some((p) => p.id === page.id)) ?? areas[0];
  const branch = area?.branch ?? 0;

  const seeds: Seed[] = [
    {
      id: page.id,
      title: page.title,
      path: tidy(page.code),
      note: WHAT_IT_IS.screen,
      node: page,
      kind: page.kind,
      blocks: [],
      more: 0,
      inside: 0,
      branch,
      parent: null,
    },
  ];
  const placed = new Set([page.id]);

  const pieces = piecesOf(map, page.id, byId).slice(0, MAX_PIECES);
  for (const piece of pieces) {
    placed.add(piece.id);
    seeds.push({
      id: piece.id,
      title: piece.title,
      path: piece.code,
      note: WHAT_IT_IS[piece.kind],
      node: piece,
      kind: piece.kind,
      blocks: [],
      more: 0,
      inside: 0,
      branch,
      parent: page.id,
    });
  }

  // Where this page leads, on the same row: from here you either set
  // something off, or you go somewhere.
  let links = 0;
  for (const e of map.edges) {
    if (e.kind !== "opens" || e.from !== page.id || links >= MAX_LINKS) continue;
    const next = byId.get(e.to);
    if (!next || placed.has(next.id)) continue;
    placed.add(next.id);
    links++;
    const theirs = areas.find((a) => a.pages.some((p) => p.id === next.id));
    seeds.push({
      id: next.id,
      title: next.title,
      path: tidy(next.code),
      note: "Where this can take you",
      node: next,
      kind: "screen" as NodeKind,
      blocks: [],
      more: 0,
      inside: 0,
      into: { at: "page", id: next.id } as Level,
      branch: theirs?.branch ?? branch,
      parent: page.id,
    });
  }

  // One step further out: what those pieces lean on in turn. Two deep is a
  // chain anyone can follow; three deep is a diagram again.
  let deeper = 0;
  for (const piece of pieces) {
    if (piece.kind === "data" || deeper >= MAX_DEEPER) continue;
    for (const next of piecesOf(map, piece.id, byId).slice(0, 2)) {
      if (placed.has(next.id) || deeper >= MAX_DEEPER) continue;
      placed.add(next.id);
      deeper++;
      seeds.push({
        id: next.id,
        title: next.title,
        path: next.code,
        note: WHAT_IT_IS[next.kind],
        node: next,
        kind: next.kind,
        blocks: [],
        more: 0,
        inside: 0,
        branch,
        parent: piece.id,
      });
    }
  }

  return {
    ...layout(seeds, detailed),
    journeys: [],
    title: page.title,
    hint: "What happens on this page. Click any card to change that part.",
    up: (() => {
      const part = partOf(map, page.id);
      return part ? { at: "area", key: part.key } : APP_LEVEL;
    })(),
    collapsible: false,
  };
}

/**
 * `detailed` decides whether cards list what's inside them. Collapsed, the
 * same map reads as pure structure.
 */
export function buildLevel(map: RepoMap, level: Level, detailed = true): Sitemap {
  if (level.at === "area") return buildArea(map, level.key, detailed);
  if (level.at === "page") return buildPage(map, level.id, detailed);
  return buildApp(map, detailed);
}
