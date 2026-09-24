import type { GraphNode, NodeKind, RepoMap } from "@/lib/graph";

/**
 * The parts an app is made of, in the words its owner would use — Accounts,
 * Importing, Payments — worked out from what each piece is for.
 *
 * This is the level someone meets the app at. Files are the answer to a
 * later question; nobody's first question about their own app is "which
 * file imports which".
 */

export type Feature = {
  name: string;
  nodeIds: string[];
  counts: Record<NodeKind, number>;
  /** "4 pages · 2 places requests arrive" */
  summary: string;
  /** Other features this one reaches into. */
  uses: string[];
};

const OTHER = "Everything else";

/** Nicely capitalised words from a path segment. */
function pretty(segment: string): string {
  const words = segment.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The part of an address that names the area of the app. */
function fromAddress(code: string): string | null {
  const parts = code
    .replace(/^\w+\s+/, "")
    .split("/")
    .filter(Boolean)
    .filter((s) => !s.startsWith(":") && !/^(api|v\d+)$/i.test(s));
  return parts.length ? pretty(parts[0]) : null;
}

/** The folder a file sits in, when it says something. */
function fromFolder(file: string): string | null {
  const parts = file.split("/").slice(0, -1);
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (/^(src|app|lib|libs|components?|utils?|helpers?|server|client|api|pages?)$/i.test(part)) {
      continue;
    }
    return pretty(part);
  }
  return null;
}

export function groupIntoFeatures(map: RepoMap, max = 8): Feature[] {

  const named = new Map<string, string>();

  // Pages and doors carry their area in their address.
  for (const n of map.nodes) {
    const name =
      n.feature ??
      (n.kind === "screen" || n.kind === "door" ? fromAddress(n.code) : null);
    if (name) named.set(n.id, name);
  }

  // The quiet pieces take their name from whoever leans on them: a file only
  // the Reddit pages use belongs with Reddit.
  for (const n of map.nodes) {
    if (named.has(n.id)) continue;
    const votes = new Map<string, number>();
    for (const id of n.dependents) {
      const name = named.get(id);
      if (name) votes.set(name, (votes.get(name) ?? 0) + 1);
    }
    const winner = [...votes].sort((a, b) => b[1] - a[1])[0]?.[0];
    named.set(n.id, winner ?? fromFolder(n.file) ?? OTHER);
  }

  const groups = new Map<string, GraphNode[]>();
  for (const n of map.nodes) {
    const name = named.get(n.id) ?? OTHER;
    const list = groups.get(name) ?? [];
    list.push(n);
    groups.set(name, list);
  }

  // Ten groups, half of them holding one box, is the same wall of boxes with
  // new labels on it. Keep the parts that are actually parts.
  const ordered = [...groups].sort((a, b) => b[1].length - a[1].length);
  const worthIt = ordered.filter(([, list], i) => list.length > 1 || i < 4);
  const kept = worthIt.slice(0, max);
  const spare = ordered
    .filter((entry) => !kept.includes(entry))
    .flatMap(([, list]) => list);
  if (spare.length) {
    const existing = kept.find(([name]) => name === OTHER);
    if (existing) existing[1].push(...spare);
    else kept.push([OTHER, spare]);
  }

  const featureOfNode = new Map<string, string>();
  for (const [name, list] of kept) {
    for (const n of list) featureOfNode.set(n.id, name);
  }

  return kept.map(([name, list]) => {
    const counts: Record<NodeKind, number> = { screen: 0, door: 0, logic: 0, data: 0 };
    for (const n of list) counts[n.kind]++;

    const uses = new Set<string>();
    for (const e of map.edges) {
      if (featureOfNode.get(e.from) !== name) continue;
      const other = featureOfNode.get(e.to);
      if (other && other !== name) uses.add(other);
    }

    const parts: string[] = [];
    if (counts.screen) parts.push(`${counts.screen} ${counts.screen === 1 ? "page" : "pages"}`);
    if (counts.door) parts.push(`${counts.door} ${counts.door === 1 ? "request" : "requests"} come in`);
    if (counts.logic) parts.push(`${counts.logic} behind the scenes`);
    if (counts.data) parts.push(`${counts.data} kinds of information`);

    return {
      name,
      nodeIds: list.map((n) => n.id),
      counts,
      summary: parts.join(" · "),
      uses: [...uses],
    };
  });
}
