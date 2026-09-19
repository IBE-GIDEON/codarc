import type { GraphNode } from "@/lib/graph";

/**
 * Matching is forgiving on purpose: someone who can't read the code will
 * search for "login" or "payments", not for a symbol name. So we look across
 * the plain title, the technical name and the file path at once.
 */
export function matchNodes(
  nodes: GraphNode[],
  query: string,
): Set<string> | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  const terms = q.split(/\s+/).filter(Boolean);
  const hits = new Set<string>();

  for (const n of nodes) {
    const haystack =
      `${n.title} ${n.code} ${n.file} ${n.summary}`.toLowerCase();
    if (terms.every((t) => haystack.includes(t))) hits.add(n.id);
  }
  return hits;
}

/** Splits a label so the matched run can be wrapped in a highlight. */
export function highlightParts(
  text: string,
  query: string,
): { text: string; hit: boolean }[] {
  const q = query.trim();
  if (!q) return [{ text, hit: false }];

  const terms = [...new Set(q.split(/\s+/).filter(Boolean))].sort(
    (a, b) => b.length - a.length,
  );
  const escaped = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(${escaped.join("|")})`, "ig");

  return text
    .split(re)
    .filter((part) => part !== "")
    .map((part) => ({
      text: part,
      hit: terms.some((t) => t.toLowerCase() === part.toLowerCase()),
    }));
}
