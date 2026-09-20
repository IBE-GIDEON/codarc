import type { GraphNode, RepoMap } from "@/lib/graph";

/**
 * "What breaks if I touch this?"
 *
 * The question a non-technical founder actually asks before changing
 * anything, and the reason most of them never change anything at all.
 *
 * Answered by walking *up* the dependency graph: everything that relies on
 * this piece, and everything that relies on those. Computed from the complete
 * edge set rather than the handful of lines we draw, because a reassuring
 * answer derived from an incomplete picture is worse than no answer.
 */

export type Risk = "safe" | "care" | "careful";

export type Impact = {
  /** Things that use this piece directly. */
  direct: GraphNode[];
  /** Things further along the chain that would feel it second-hand. */
  knockOn: GraphNode[];
  total: number;
  risk: Risk;
  /** One sentence anybody can read. */
  verdict: string;
};

const RISK_COPY: Record<Risk, string> = {
  safe: "Nothing else depends on this, so changing it is about as safe as it gets.",
  care: "A couple of things lean on this. Worth reading the change before you accept it.",
  careful:
    "A lot of your app leans on this. Change it deliberately, and test the things listed below afterwards.",
};

export function computeImpact(map: RepoMap, nodeId: string): Impact {
  const byId = new Map(map.nodes.map((n) => [n.id, n]));
  const start = byId.get(nodeId);

  if (!start) {
    return { direct: [], knockOn: [], total: 0, risk: "safe", verdict: RISK_COPY.safe };
  }

  const directIds = new Set(start.dependents);
  const seen = new Set<string>([nodeId, ...directIds]);
  const knockOnIds = new Set<string>();

  // Breadth-first up the chain. The graph can contain cycles, so `seen`
  // does double duty as the visit guard.
  let frontier = [...directIds];
  while (frontier.length) {
    const next: string[] = [];
    for (const id of frontier) {
      const node = byId.get(id);
      if (!node) continue;
      for (const parent of node.dependents) {
        if (seen.has(parent)) continue;
        seen.add(parent);
        knockOnIds.add(parent);
        next.push(parent);
      }
    }
    frontier = next;
  }

  const resolve = (ids: Iterable<string>) =>
    [...ids]
      .map((id) => byId.get(id))
      .filter((n): n is GraphNode => Boolean(n))
      .sort((a, b) => a.title.localeCompare(b.title));

  const direct = resolve(directIds);
  const knockOn = resolve(knockOnIds);
  const total = direct.length + knockOn.length;

  const risk: Risk = total === 0 ? "safe" : total <= 3 ? "care" : "careful";

  return { direct, knockOn, total, risk, verdict: RISK_COPY[risk] };
}

/** Every id touched, for dimming the rest of the canvas. */
export function impactIds(impact: Impact): Set<string> {
  return new Set([...impact.direct, ...impact.knockOn].map((n) => n.id));
}

/** "3 things" / "1 thing" */
export function things(n: number) {
  return `${n} ${n === 1 ? "thing" : "things"}`;
}
