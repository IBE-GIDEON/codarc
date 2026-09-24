import type { GraphNode, RepoMap } from "@/lib/graph";
import type { Feature } from "@/lib/features";

/**
 * The app as a family tree: one root, branching down.
 *
 *              YOUR APP
 *         ┌───────┴───────┐
 *      FRIENDS         PROFILES
 *     ┌───┴───┐        ┌───┴──┐
 *   List   Detail    View   Edit
 *
 * A tree is the one shape everybody already reads — it's how org charts and
 * family trees work — and the lines can stay drawn all the time because they
 * only ever go down and across, never diagonally through anything.
 */

export const TREE_W = 176;
export const TREE_H = 46;
const GAP_X = 22;
const GAP_Y = 62;

export type TreeBox = {
  id: string;
  title: string;
  /** The address, for a page, or nothing at all. */
  subtitle?: string;
  /** The app itself and its parts: headings, not pieces of code. */
  isGroup: boolean;
  /** Set for a part, so clicking it can open that part. */
  featureName?: string;
  /** The real map node behind this box, when there is one. */
  node?: GraphNode;
  depth: number;
  x: number;
  y: number;
};

export type TreeLink = { from: string; to: string };

export type Tree = { boxes: TreeBox[]; links: TreeLink[] };

/**
 * Builds the tree: the app, then its parts, then the pages in each part,
 * then whatever those set off, level by level, each piece appearing once at
 * the shallowest place it belongs.
 */
export function buildTree(map: RepoMap, features: Feature[], maxDepth = 5): Tree {
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const boxes: TreeBox[] = [];
  const links: TreeLink[] = [];
  const placed = new Set<string>();

  const root: TreeBox = {
    id: "app",
    title: map.repo,
    subtitle: "your app",
    isGroup: true,
    depth: 0,
    x: 0,
    y: 0,
  };
  boxes.push(root);

  // The home page hangs off the app itself. It's where people arrive, not a
  // detail of some part.
  const home = map.nodes.find((n) => n.kind === "screen" && n.code === "/");
  if (home) {
    placed.add(home.id);
    boxes.push({
      id: home.id,
      title: home.title,
      subtitle: "/",
      isGroup: false,
      node: home,
      depth: 1,
      x: 0,
      y: 0,
    });
    links.push({ from: root.id, to: home.id });
  }

  // Level one: the parts of the app.
  const featureBoxes = features.map((f) => {
    const box: TreeBox = {
      id: `feature:${f.name}`,
      title: f.name,
      subtitle: f.summary.split(" · ")[0],
      isGroup: true,
      featureName: f.name,
      depth: 1,
      x: 0,
      y: 0,
    };
    boxes.push(box);
    links.push({ from: root.id, to: box.id });
    return { feature: f, box };
  });

  // Level two: what you can actually open in each part, pages first.
  const frontier: { id: string; nodeIds: string[] }[] = [];
  for (const { feature, box } of featureBoxes) {
    const own = feature.nodeIds.map((id) => byId.get(id)!).filter(Boolean);
    const entry = own.filter((n) => n.kind === "screen");
    const heads = (entry.length ? entry : own).slice(0, 6);

    const childIds: string[] = [];
    for (const n of heads) {
      if (placed.has(n.id)) {
        links.push({ from: box.id, to: n.id });
        continue;
      }
      placed.add(n.id);
      boxes.push({
        id: n.id,
        title: n.title,
        subtitle: n.kind === "screen" || n.kind === "door" ? n.code : undefined,
        isGroup: false,
        node: n,
        depth: 2,
        x: 0,
        y: 0,
      });
      links.push({ from: box.id, to: n.id });
      childIds.push(n.id);
    }
    frontier.push({ id: box.id, nodeIds: childIds });
  }

  // Deeper: what each of those sets off, and what that leans on.
  let depth = 3;
  let edge = frontier.flatMap((f) => f.nodeIds);
  while (edge.length && depth <= maxDepth) {
    const next: string[] = [];
    for (const parentId of edge) {
      for (const e of map.edges) {
        if (e.from !== parentId) continue;
        const child = byId.get(e.to);
        // A page linking to another page is a side door, not a branch of the
        // tree. Those belong in the panel, not in the shape of the app.
        if (!child || e.kind === "opens") continue;

        if (placed.has(child.id)) {
          links.push({ from: parentId, to: child.id });
          continue;
        }
        placed.add(child.id);
        boxes.push({
          id: child.id,
          title: child.title,
          subtitle: child.kind === "door" ? child.code : undefined,
          isGroup: false,
          node: child,
          depth,
          x: 0,
          y: 0,
        });
        links.push({ from: parentId, to: child.id });
        next.push(child.id);
      }
    }
    edge = next;
    depth += 1;
  }

  return { boxes, links };
}

/**
 * Positions the boxes on screen: children packed left to right, each parent
 * centred over the ones it holds — the shape an org chart makes. Run on
 * whatever is open at the time, so a closed branch costs no room.
 */
export function place(boxes: TreeBox[], links: TreeLink[]) {
  const childrenOf = new Map<string, string[]>();
  const box = new Map(boxes.map((b) => [b.id, b]));
  for (const l of links) {
    // Only the first parent decides where a shared box sits; the rest just
    // draw a line to it.
    const kids = childrenOf.get(l.from) ?? [];
    kids.push(l.to);
    childrenOf.set(l.from, kids);
  }

  const owner = new Map<string, string>();
  for (const l of links) if (!owner.has(l.to)) owner.set(l.to, l.from);

  let cursor = 0;
  const seen = new Set<string>();
  const walk = (id: string): number => {
    const me = box.get(id)!;
    if (seen.has(id)) return me.x;
    seen.add(id);
    const kids = (childrenOf.get(id) ?? []).filter(
      (k) => owner.get(k) === id && box.has(k),
    );

    if (!kids.length) {
      me.x = cursor;
      cursor += TREE_W + GAP_X;
    } else {
      const centres = kids.map(walk);
      me.x = (centres[0] + centres[centres.length - 1]) / 2;
    }
    me.y = me.depth * (TREE_H + GAP_Y);
    return me.x;
  };

  walk("app");
}
