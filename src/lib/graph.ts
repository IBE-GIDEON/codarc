/** The shape of a mapped repository. Shared by the analyzer and the canvas. */

export type NodeKind = "screen" | "door" | "logic" | "data";

/** Plain-English names for each kind — customers here mostly don't code. */
export const KIND_COPY: Record<
  NodeKind,
  { label: string; plural: string; blurb: string }
> = {
  screen: {
    label: "Screen",
    plural: "Screens",
    blurb: "A page people actually look at.",
  },
  door: {
    label: "Door",
    plural: "Doors",
    blurb: "Where a request arrives from the outside world.",
  },
  logic: {
    label: "Logic",
    plural: "Logic",
    blurb: "The part that does the actual work.",
  },
  data: {
    label: "Data",
    plural: "Data",
    blurb: "The shape of something you store.",
  },
};

export type GraphNode = {
  id: string;
  kind: NodeKind;
  /** Short feature name used to group related boxes, e.g. "Reddit". */
  feature?: string;
  /** Plain-English title, e.g. "Sign in". */
  title: string;
  /** The technical name, e.g. "POST /auth/login". Shown in mono, smaller. */
  code: string;
  /** One or two sentences a non-developer can read. */
  summary: string;
  file: string;
  line: number;
  /**
   * Other files doing the same job, folded into this one box. Three files
   * that all mean "where your information is kept" are one thing to the
   * person looking, not three.
   */
  alsoIn?: string[];
  /** Extra files this node's change would likely touch. */
  related: string[];
  /**
   * Ids of the nodes that directly depend on this one, from the *complete*
   * edge set — the drawn edges are trimmed for legibility, and blast radius
   * must never be computed from a picture that left things out.
   */
  dependents: string[];
  x: number;
  y: number;
};

export type GraphEdge = {
  from: string;
  to: string;
  /**
   * "opens" is a link someone can click: this page leads to that one.
   * "uses" is the app reaching for something behind the scenes.
   */
  kind?: "uses" | "opens";
};

export type RepoMap = {
  owner: string;
  /** A paragraph anyone can read, describing what the app is. */
  overview: string;
  /** The handful of things this app is mostly about. */
  features: { name: string; count: number }[];
  repo: string;
  branch: string;
  description: string | null;
  /** Only its owner and their team can open a private one. */
  isPrivate?: boolean;
  /** Frameworks we recognised, e.g. ["FastAPI", "Next.js"]. */
  stacks: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** The bands behind the boxes, in map coordinates. */
  layers: Layer[];
  stats: {
    filesScanned: number;
    filesTotal: number;
    truncated: boolean;
    /** How many of each kind we found before trimming to the busiest. */
    found: Record<NodeKind, number>;
  };
};

export const NODE_W = 208;
export const NODE_H = 52;
export const COL_GAP = 148;
export const ROW_GAP = 18;

/**
 * The map is read top to bottom, each band one step further from the person
 * using the app. The names are what someone sees first, so they're written
 * for someone who has never opened a file.
 */
export const LAYER_LABEL: Record<NodeKind, string> = {
  screen: "Pages people open",
  door: "What that sets off",
  logic: "The work behind it",
  data: "Where things are kept",
};

/** A labelled band on the canvas, worked out when the map is laid out. */
export type Layer = {
  kind: NodeKind;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** Spacing for the top-to-bottom layout. */
export const GAP_X = 24;
export const GAP_Y = 18;
export const BAND_TOP = 38;
export const BAND_BOTTOM = 18;
export const BAND_GAP = 44;
/** Boxes per row before a band wraps onto another line. */
export const PER_ROW = 5;

export const KIND_ORDER: NodeKind[] = ["screen", "door", "logic", "data"];
