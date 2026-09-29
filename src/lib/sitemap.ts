import type { GraphNode, NodeKind, RepoMap } from "@/lib/graph";

/**
 * Your app as a site map: one card per page, laid out the way the addresses
 * nest, with what each page actually does listed inside it.
 *
 * This is the shape design tools use to plan a site before it's built —
 * FlowMapp, Whimsical, a whiteboard — read backwards out of code that's
 * already written. Structure runs down the page in straight elbows; the
 * links people can click curve across it in colour.
 */

export const CARD_W = 212;
const HEAD_H = 46;
const ROW_H = 23;
const CARD_PAD = 10;
const GAP_X = 52;
const GAP_Y = 92;
const MAX_ROWS = 6;
/** How many cards sit side by side before a row wraps. */
const PER_ROW = 4;

/** One line inside a card: something the page does. */
export type Block = {
  id: string;
  title: string;
  kind: NodeKind;
};

export type PageCard = {
  id: string;
  title: string;
  path: string;
  node: GraphNode;
  blocks: Block[];
  /** Blocks that didn't fit. */
  more: number;
  /** Everything this page does, counted even when the card is collapsed. */
  inside: number;
  /**
   * Which branch of the app this card belongs to. Every page under
   * /dashboard shares one colour, so a section can be seen at a glance
   * instead of read one card at a time.
   */
  branch: number;
  depth: number;
  x: number;
  y: number;
  h: number;
};

/** A line someone can click their way along, page to page. */
export type Journey = { from: string; to: string };

export type Sitemap = {
  cards: PageCard[];
  /** The structure: which page sits under which. */
  branches: { from: string; to: string }[];
  journeys: Journey[];
  width: number;
  height: number;
};

const tidy = (path: string) => path.replace(/\/+$/, "") || "/";

/** The page one level up: the longest other address this one sits inside. */
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

/**
 * `detailed` decides whether each card lists what's inside it. Collapsed,
 * the same map reads as pure structure — which page sits under which.
 */
export function buildSitemap(map: RepoMap, detailed = true): Sitemap {
  const pages = map.nodes.filter((n) => n.kind === "screen");
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const paths = pages.map((p) => tidy(p.code));
  const cardByPath = new Map<string, PageCard>();

  const cards: PageCard[] = pages.map((page) => {
    // What this page does: what it asks the app for, and what it leans on.
    const inside: Block[] = [];
    for (const e of map.edges) {
      if (e.from !== page.id || e.kind === "opens") continue;
      const target = byId.get(e.to);
      if (!target || inside.some((b) => b.id === target.id)) continue;
      inside.push({ id: target.id, title: target.title, kind: target.kind });
    }
    // Doors first — those are the moments something happens.
    const order: NodeKind[] = ["door", "data", "logic", "screen"];
    inside.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));

    const blocks = detailed ? inside.slice(0, MAX_ROWS) : [];
    const card: PageCard = {
      id: page.id,
      title: page.title.replace(/ page$/i, ""),
      path: tidy(page.code),
      node: page,
      blocks,
      more: detailed ? Math.max(0, inside.length - blocks.length) : 0,
      /** How many things are inside, whether or not they're listed. */
      inside: inside.length,
      branch: 0,
      depth: 0,
      x: 0,
      y: 0,
      // A card with nothing inside still gets its sketch, so a row of cards
      // lines up instead of stepping up and down.
      h: HEAD_H + (blocks.length ? blocks.length * ROW_H + CARD_PAD : detailed ? 64 : 0),
    };
    cardByPath.set(card.path, card);
    return card;
  });

  // Structure: nesting addresses, so /dashboard/collections sits under
  // /dashboard, the way anybody would draw it by hand.
  const branches: { from: string; to: string }[] = [];
  const childrenOf = new Map<string, PageCard[]>();
  const roots: PageCard[] = [];

  for (const card of cards) {
    const parentPath = parentOf(card.path, paths);
    const parent = parentPath ? cardByPath.get(parentPath) : undefined;
    if (parent) {
      branches.push({ from: parent.id, to: card.id });
      const list = childrenOf.get(parent.id) ?? [];
      list.push(card);
      childrenOf.set(parent.id, list);
    } else {
      roots.push(card);
    }
  }

  // Depth, then position: children packed left to right, parents centred.
  const setDepth = (card: PageCard, depth: number) => {
    card.depth = depth;
    for (const kid of childrenOf.get(card.id) ?? []) setDepth(kid, depth + 1);
  };
  for (const root of roots) setDepth(root, 0);

  /*
   * Children sit under their parent, left to right — but a parent with ten
   * pages under it would stretch the map three screens wide and force it
   * open at 40%, where nothing can be read. So a long row of plain pages
   * wraps onto a second line, the way a shelf does.
   */
  const subRow = new Map<string, number>();
  let cursor = 0;
  const walk = (card: PageCard): number => {
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
        const col = i % PER_ROW;
        kid.x = start + col * (CARD_W + GAP_X);
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
  const deepest = Math.max(0, ...cards.map((c) => c.depth));
  let y = 0;
  for (let depth = 0; depth <= deepest; depth++) {
    rowTop.set(depth, y);
    const here = cards.filter((c) => c.depth === depth);
    const tallest = Math.max(0, ...here.map((c) => c.h));
    const lines = 1 + Math.max(0, ...here.map((c) => subRow.get(c.id) ?? 0));
    y += lines * tallest + (lines - 1) * 20 + GAP_Y;
  }
  for (const card of cards) {
    const band = rowTop.get(card.depth) ?? 0;
    const tallest = Math.max(
      0,
      ...cards.filter((c) => c.depth === card.depth).map((c) => c.h),
    );
    card.y = band + (subRow.get(card.id) ?? 0) * (tallest + 20);
  }

  // Colour by branch: everything under /dashboard shares a colour, the home
  // page keeps its own.
  const branchOf = new Map<string, number>();
  let nextBranch = 1;
  for (const card of [...cards].sort((a, b) => a.depth - b.depth)) {
    if (card.depth === 0) {
      card.branch = 0;
      continue;
    }
    const top = `/${card.path.split("/").filter(Boolean)[0] ?? ""}`;
    if (!branchOf.has(top)) branchOf.set(top, nextBranch++);
    card.branch = branchOf.get(top)!;
  }

  // The links people can click, minus the ones the structure already shows.
  const structural = new Set(branches.map((b) => `${b.from}->${b.to}`));
  const journeys: Journey[] = [];
  for (const e of map.edges) {
    if (e.kind !== "opens") continue;
    if (structural.has(`${e.from}->${e.to}`)) continue;
    if (!cardByPath.has(tidy(byId.get(e.to)?.code ?? ""))) continue;
    journeys.push({ from: e.from, to: e.to });
  }

  return {
    cards,
    branches,
    journeys,
    width: Math.max(1, ...cards.map((c) => c.x + CARD_W)),
    height: Math.max(1, ...cards.map((c) => c.y + c.h)),
  };
}
