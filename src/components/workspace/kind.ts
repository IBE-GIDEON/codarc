import type { NodeKind } from "@/lib/graph";

/**
 * The logo's three pills are the legend: purple doors, blue logic, amber data.
 * Screens are the fourth thing and sit outside that triad, so they borrow the
 * system's green rather than inventing a brand colour.
 */
export const KIND_COLOR: Record<NodeKind, string> = {
  screen: "var(--c-green)",
  door: "var(--brand-purple)",
  logic: "var(--brand-blue)",
  data: "var(--brand-amber)",
};

/** Wording aimed at someone who has never opened the repository. */
export const KIND_LEGEND: { kind: NodeKind; label: string; hint: string }[] = [
  {
    kind: "screen",
    label: "Screens",
    hint: "Pages people actually see and click.",
  },
  {
    kind: "door",
    label: "Doors",
    hint: "Where a request arrives — from your own screens, a phone app, or another company.",
  },
  {
    kind: "logic",
    label: "Logic",
    hint: "The part that does the real work once a request is inside.",
  },
  {
    kind: "data",
    label: "Data",
    hint: "The shape of the things you save — a user, an order, a message.",
  },
];
