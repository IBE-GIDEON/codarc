import {
  COL_GAP,
  KIND_ORDER,
  NODE_H,
  NODE_W,
  ROW_GAP,
  type GraphEdge,
  type GraphNode,
  type NodeKind,
  type RepoMap,
} from "@/lib/graph";
import {
  dataSummary,
  dataTitle,
  featureOf,
  logicSummary,
  logicTitleFromPath,
  plural,
  purposeTitle,
  routeSummary,
  routeTitle,
  screenSummary,
  screenTitle,
} from "@/lib/humanize";
import { fetchFiles, fetchRepoMeta, fetchTree } from "@/lib/github";

/* ---------------------------------------------------------------- picking */

const CODE_EXT = /\.(py|ts|tsx|js|jsx|mjs|cjs|prisma)$/i;

const SKIP =
  /(^|\/)(node_modules|\.next|\.nuxt|dist|build|out|coverage|vendor|\.venv|venv|env|__pycache__|site-packages|\.git|migrations|__tests__|tests?|spec|e2e|fixtures|examples?|samples?|docs?|public|static|assets|storybook|\.storybook)(\/|$)/i;

const NOISE = /\.(test|spec|d|min|config|stories)\.[jt]sx?$/i;

const INTERESTING =
  /(route|router|api|endpoint|service|controller|handler|model|schema|entity|repositor|usecase|domain|server|lib|app|src|page|view)/i;

const MAX_FILES = 220;

function pickFiles(entries: { path: string; size: number }[]) {
  return entries
    .filter(
      (e) =>
        CODE_EXT.test(e.path) &&
        !SKIP.test(e.path) &&
        !NOISE.test(e.path) &&
        e.size < 180_000,
    )
    .map((e) => ({
      path: e.path,
      score:
        (INTERESTING.test(e.path) ? 10 : 0) -
        e.path.split("/").length * 0.5 -
        e.path.length * 0.002,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_FILES)
    .map((e) => e.path);
}

/* -------------------------------------------------------------- resolving */

/** Maps an import specifier to a file we actually scanned. */
function makeResolver(files: Set<string>) {
  const suffixIndex = new Map<string, string[]>();
  for (const f of files) {
    const noExt = f.replace(CODE_EXT, "");
    const parts = noExt.split("/");
    for (let i = 0; i < parts.length; i++) {
      const key = parts.slice(i).join("/");
      const list = suffixIndex.get(key) ?? [];
      list.push(f);
      suffixIndex.set(key, list);
    }
  }

  return function resolve(from: string, spec: string): string | null {
    let target = spec;
    const isPython = /\.py$/i.test(from);

    if (isPython) {
      // "from ..core.models import X" — the leading dots say how far up to go,
      // the rest is a dotted module path, not slashes.
      const rel = /^(\.+)(.*)$/.exec(spec);
      const dir = from.split("/").slice(0, -1);
      if (rel) {
        for (let i = 1; i < rel[1].length; i++) dir.pop();
        target = [...dir, ...rel[2].split(".").filter(Boolean)].join("/");
      } else {
        target = spec.split(".").filter(Boolean).join("/");
      }
    } else if (spec.startsWith(".")) {
      const base = from.split("/").slice(0, -1);
      for (const part of spec.split("/")) {
        if (part === "." || part === "") continue;
        else if (part === "..") base.pop();
        else base.push(part);
      }
      target = base.join("/");
    } else if (spec.startsWith("@/") || spec.startsWith("~/")) {
      target = spec.slice(2);
    } else if (/^[a-z@]/i.test(spec) && !spec.includes("/")) {
      // bare package like "react" — unless it's a python dotted module
      if (!spec.includes(".")) return null;
      target = spec.replace(/\./g, "/");
    } else if (spec.includes(".") && !spec.includes("/")) {
      target = spec.replace(/\./g, "/");
    }

    target = target.replace(/^\/+/, "").replace(CODE_EXT, "");

    const candidates = suffixIndex.get(target);
    if (candidates?.length) return candidates[0];

    const withIndex = suffixIndex.get(`${target}/index`);
    if (withIndex?.length) return withIndex[0];

    const withInit = suffixIndex.get(`${target}/__init__`);
    if (withInit?.length) return withInit[0];

    const tail = target.split("/").slice(-2).join("/");
    const loose = suffixIndex.get(tail);
    if (loose?.length === 1) return loose[0];

    return null;
  };
}

function lineOf(src: string, index: number) {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) {
    if (src.charCodeAt(i) === 10) line++;
  }
  return line;
}

/* --------------------------------------------------------------- findings */

type Found = Omit<GraphNode, "x" | "y" | "related" | "dependents">;

/**
 * Routers are almost always mounted under a prefix, so a bare "/" in
 * routes/items.py is really "/items". Without this every CRUD file looks
 * identical on the canvas.
 */
function routerPrefix(path: string, src: string): string {
  const declared =
    /(?:APIRouter|Blueprint|Router)\s*\([^)]*(?:url_)?prefix\s*=\s*(['"])([^'"]*)\1/.exec(
      src,
    );
  if (declared?.[2]) return declared[2].replace(/\/+$/, "");

  const base = (path.split("/").pop() ?? "").replace(CODE_EXT, "");
  if (!base || /^(main|app|index|__init__|routes?|api|urls?|server)$/i.test(base)) {
    return "";
  }
  return `/${base.replace(/_/g, "-")}`;
}

function joinPath(prefix: string, route: string): string {
  const r = route.startsWith("/") ? route : `/${route}`;
  const tidy = (s: string) => s.replace(/\/{2,}/g, "/").replace(/(.)\/$/, "$1") || "/";
  // The author may already have written the prefix into the route.
  if (!prefix || r === prefix || r.startsWith(`${prefix}/`)) return tidy(r);
  return tidy(prefix + r);
}

/** Django writes URLs as regexes. Turn them back into something readable. */
function cleanDjangoPath(raw: string): string {
  const cleaned = raw
    .replace(/\(\?P<(\w+)>[^)]*\)/g, "{$1}") // named capture -> {name}
    .replace(/<[\w]+:(\w+)>/g, "{$1}") // <slug:title>  -> {title}
    .replace(/<(\w+)>/g, "{$1}")
    .replace(/\(\?:[^)]*\)/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/[\^$*+\\?\[\]]/g, "")
    .replace(/\/{2,}/g, "/")
    .replace(/(.)\/$/, "$1");
  return `/${cleaned.replace(/^\/+/, "")}`;
}

function pyRoutes(path: string, src: string): Found[] {
  const out: Found[] = [];
  const prefix = routerPrefix(path, src);

  const decorated =
    /@(\w+)\.(get|post|put|patch|delete|head|options)\s*\(\s*(['"])([^'"]*)\3/gi;
  for (let m; (m = decorated.exec(src)); ) {
    const method = m[2].toUpperCase();
    const route = joinPath(prefix, m[4] || "/");
    out.push({
      id: `door:${path}:${method}:${route}`,
      kind: "door",
      title: purposeTitle(method, route) ?? routeTitle(method, route),
      code: `${method} ${route}`,
      summary: routeSummary(method, route),
      file: path,
      line: lineOf(src, m.index),
    });
  }

  const flask = /@(\w+)\.route\s*\(\s*(['"])([^'"]*)\2([^)]*)\)/gi;
  for (let m; (m = flask.exec(src)); ) {
    const route = joinPath(prefix, m[3] || "/");
    const methods = [...m[4].matchAll(/['"](GET|POST|PUT|PATCH|DELETE)['"]/gi)]
      .map((x) => x[1].toUpperCase());
    for (const method of methods.length ? methods : ["GET"]) {
      out.push({
        id: `door:${path}:${method}:${route}`,
        kind: "door",
        title: purposeTitle(method, route) ?? routeTitle(method, route),
        code: `${method} ${route}`,
        summary: routeSummary(method, route),
        file: path,
        line: lineOf(src, m.index),
      });
    }
  }

  if (/urls?\.py$/i.test(path)) {
    const django = /\b(?:path|re_path|url)\s*\(\s*r?(['"])([^'"]*)\1/g;
    for (let m; (m = django.exec(src)); ) {
      const route = cleanDjangoPath(m[2]);
      out.push({
        id: `door:${path}:ANY:${route}`,
        kind: "door",
        title: purposeTitle("GET", route) ?? routeTitle("GET", route),
        code: route,
        summary: routeSummary("GET", route),
        file: path,
        line: lineOf(src, m.index),
      });
    }

    // Django REST Framework mounts whole resources in one line.
    const drf = /\b\w*router\w*\.register\s*\(\s*r?(['"])([^'"]*)\1/gi;
    for (let m; (m = drf.exec(src)); ) {
      const route = cleanDjangoPath(m[2]);
      out.push({
        id: `door:${path}:SET:${route}`,
        kind: "door",
        title: purposeTitle("GET", route) ?? routeTitle("GET", route),
        code: route,
        summary: `The full set of read, create, update and delete addresses for ${route}.`,
        file: path,
        line: lineOf(src, m.index),
      });
    }
  }

  return out;
}

/**
 * Most projects don't inherit straight from the framework — Django apps
 * subclass their own `TimestampedModel`, DRF exposes `ArticleSerializer`.
 * Match the suffix rather than a fixed list of framework base classes.
 */
const PY_MODEL_BASE =
  /\b(?:\w*(?:Model|Schema|Serializer|Document|Entity)|Base|TypedDict)\b/;

function pyShapes(path: string, src: string): Found[] {
  const out: Found[] = [];
  const cls = /^[ \t]*class\s+(\w+)\s*(?:\(([^)]*)\))?\s*:/gm;

  for (let m; (m = cls.exec(src)); ) {
    const name = m[1];
    const bases = m[2] ?? "";
    if (!PY_MODEL_BASE.test(bases)) continue;
    out.push({
      id: `data:${path}:${name}`,
      kind: "data",
      title: dataTitle(name),
      code: name,
      summary: dataSummary(name),
      file: path,
      line: lineOf(src, m.index),
    });
  }
  return out;
}

/** Next.js App Router folder -> URL path. */
function appRouterPath(file: string, leaf: RegExp): string {
  const after = file.replace(/^.*?(?:^|\/)app\//, "");
  const dir = after.replace(leaf, "").replace(/\/$/, "");
  const segs = dir
    .split("/")
    .filter(Boolean)
    .filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith("@"))
    .map((s) => s.replace(/^\[\.\.\.(.+)\]$/, ":$1*").replace(/^\[(.+)\]$/, ":$1"));
  return `/${segs.join("/")}`;
}

function tsRoutes(path: string, src: string): Found[] {
  const out: Found[] = [];

  // Next App Router handlers
  if (/(^|\/)app\/.*\/route\.(ts|js|mjs)$/i.test(path)) {
    const url = appRouterPath(path, /\/?route\.(ts|js|mjs)$/i);
    const verbs =
      /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
    for (let m; (m = verbs.exec(src)); ) {
      const method = m[1];
      out.push({
        id: `door:${path}:${method}`,
        kind: "door",
        title: purposeTitle(method, url) ?? routeTitle(method, url),
        code: `${method} ${url}`,
        summary: routeSummary(method, url),
        file: path,
        line: lineOf(src, m.index),
      });
    }
    return out;
  }

  // Pages Router API
  if (/(^|\/)pages\/api\//i.test(path)) {
    const url = `/api/${path.replace(/^.*?pages\/api\//i, "").replace(CODE_EXT, "")}`
      .replace(/\/index$/, "")
      .replace(/\[(.+?)\]/g, ":$1");
    out.push({
      id: `door:${path}`,
      kind: "door",
      title: purposeTitle("GET", url) ?? routeTitle("GET", url),
      code: url,
      summary: `Answers requests sent to ${url}.`,
      file: path,
      line: 1,
    });
    return out;
  }

  // Express / Hono / Fastify style
  const express =
    /\b(?:app|router|server|api|r)\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/g;
  for (let m; (m = express.exec(src)); ) {
    const method = m[1].toUpperCase();
    const url = m[3];
    out.push({
      id: `door:${path}:${method}:${url}`,
      kind: "door",
      title: purposeTitle(method, url) ?? routeTitle(method, url),
      code: `${method} ${url}`,
      summary: routeSummary(method, url),
      file: path,
      line: lineOf(src, m.index),
    });
  }

  return out;
}

function tsScreens(path: string): Found[] {
  if (/(^|\/)app\/.*\/page\.(tsx|jsx|js|ts)$/i.test(path)) {
    const url = appRouterPath(path, /\/?page\.(tsx|jsx|js|ts)$/i);
    return [
      {
        id: `screen:${path}`,
        kind: "screen",
        title: screenTitle(url),
        code: url || "/",
        summary: screenSummary(url),
        file: path,
        line: 1,
      },
    ];
  }
  if (/(^|\/)pages\/(?!api\/)/i.test(path) && /\.(tsx|jsx)$/i.test(path)) {
    const url = `/${path.replace(/^.*?pages\//i, "").replace(CODE_EXT, "")}`
      .replace(/\/index$/, "")
      .replace(/\[(.+?)\]/g, ":$1");
    return [
      {
        id: `screen:${path}`,
        kind: "screen",
        title: screenTitle(url),
        code: url || "/",
        summary: screenSummary(url),
        file: path,
        line: 1,
      },
    ];
  }
  return [];
}

function tsShapes(path: string, src: string): Found[] {
  const out: Found[] = [];
  const push = (name: string, index: number) =>
    out.push({
      id: `data:${path}:${name}`,
      kind: "data",
      title: dataTitle(name),
      code: name,
      summary: dataSummary(name),
      file: path,
      line: lineOf(src, index),
    });

  if (/\.prisma$/i.test(path)) {
    const model = /^\s*model\s+(\w+)\s*\{/gm;
    for (let m; (m = model.exec(src)); ) push(m[1], m.index);
    return out;
  }

  const drizzle = /\b(?:const|let)\s+(\w+)\s*=\s*(?:pg|sqlite|mysql)Table\s*\(/g;
  for (let m; (m = drizzle.exec(src)); ) push(m[1], m.index);

  const mongoose = /\b(?:const|let)\s+(\w+)\s*=\s*(?:new\s+)?(?:mongoose\.)?Schema\s*\(/g;
  for (let m; (m = mongoose.exec(src)); ) push(m[1], m.index);

  const typeorm = /@Entity\s*\([^)]*\)\s*(?:export\s+)?class\s+(\w+)/g;
  for (let m; (m = typeorm.exec(src)); ) push(m[1], m.index);

  // Zod objects are how most AI-written apps describe their data.
  const zod = /\b(?:const|let)\s+(\w+)\s*=\s*z\.object\s*\(/g;
  for (let m; (m = zod.exec(src)); ) push(m[1].replace(/Schema$/i, ""), m.index);

  return out;
}

const LOGIC_DIR =
  /(^|\/)(services?|lib|server|core|domain|usecases?|controllers?|handlers?|repositor(y|ies)|utils?|helpers?|jobs?|workers?|agents?)(\/|$)/i;

function logicNode(path: string, src: string): Found | null {
  const isPy = /\.py$/i.test(path);
  const hasClass = isPy
    ? /^[ \t]*class\s+\w+/m.test(src)
    : /\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const)\s+\w+/.test(src);

  const named =
    /(Service|Manager|Controller|Repository|Client|Handler|Provider|Store|Agent)\b/i.test(
      path,
    ) ||
    // Django keeps its work in conventionally-named modules, not folders.
    /(^|\/)(views?|backends?|signals?|tasks?|forms?)\.py$/i.test(path);

  if (!LOGIC_DIR.test(path) && !named) return null;
  if (!hasClass) return null;

  const base = path.split("/").pop() ?? path;
  return {
    id: `logic:${path}`,
    kind: "logic",
    title: logicTitleFromPath(path),
    code: base,
    summary: "",
    file: path,
    line: 1,
  };
}

function imports(path: string, src: string): string[] {
  const specs: string[] = [];
  if (/\.py$/i.test(path)) {
    const from = /^[ \t]*from\s+([.\w]+)\s+import\s/gm;
    for (let m; (m = from.exec(src)); ) specs.push(m[1]);
    const plain = /^[ \t]*import\s+([.\w]+)/gm;
    for (let m; (m = plain.exec(src)); ) specs.push(m[1]);
  } else {
    const es = /from\s*['"]([^'"]+)['"]/g;
    for (let m; (m = es.exec(src)); ) specs.push(m[1]);
    const cjs = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (let m; (m = cjs.exec(src)); ) specs.push(m[1]);
  }
  return specs;
}

function detectStacks(files: Map<string, string>, paths: string[]): string[] {
  const all = paths.join("\n");
  const blob = [...files.values()].join("\n").slice(0, 400_000);
  const found = new Set<string>();

  if (/from\s+fastapi|FastAPI\(/.test(blob)) found.add("FastAPI");
  if (/from\s+flask|Flask\(/i.test(blob)) found.add("Flask");
  if (/django/i.test(blob) && /urls?\.py/.test(all)) found.add("Django");
  if (/(^|\/)app\/.*\/(page|route)\.(tsx?|jsx?)/m.test(all)) found.add("Next.js");
  else if (/(^|\/)pages\//m.test(all) && /next/i.test(blob)) found.add("Next.js");
  if (/from\s*['"]express['"]|require\(['"]express['"]\)/.test(blob))
    found.add("Express");
  if (/@nestjs\//.test(blob)) found.add("NestJS");
  if (/from\s*['"]hono['"]/.test(blob)) found.add("Hono");
  if (/\.prisma$/m.test(all)) found.add("Prisma");
  if (/drizzle-orm/.test(blob)) found.add("Drizzle");
  if (/mongoose/.test(blob)) found.add("Mongoose");
  if (/sqlalchemy/i.test(blob)) found.add("SQLAlchemy");

  return [...found];
}


/* ------------------------------------------------------- telling the story */

/**
 * A paragraph anyone can read. Built from the graph rather than an LLM so it
 * costs nothing and works on every deployment — the first thing a customer
 * wants is "what even is this", and they shouldn't have to pay to find out.
 */
function writeOverview(
  nodes: GraphNode[],
  features: { name: string; count: number }[],
  stacks: string[],
): string {
  const count = (kind: NodeKind) => nodes.filter((n) => n.kind === kind).length;
  const screens = count("screen");
  const doors = count("door");
  const data = count("data");

  const bits: string[] = [];

  const top = features.slice(0, 4).map((f) => f.name);
  if (top.length >= 2) {
    const list =
      top.length === 2
        ? top.join(" and ")
        : `${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}`;
    bits.push(`This app is mostly about ${list}.`);
  } else if (top.length === 1) {
    bits.push(`This app is mostly about ${top[0]}.`);
  }

  const parts: string[] = [];
  if (screens) parts.push(`${plural(screens, "page")} people can visit`);
  if (doors) parts.push(`${plural(doors, "place")} where requests come in`);
  if (data) parts.push(`${plural(data, "kind")} of information it stores`);

  if (parts.length) {
    const list =
      parts.length === 1
        ? parts[0]
        : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
    bits.push(`It has ${list}.`);
  }

  if (stacks.length) {
    bits.push(`It was built with ${stacks.slice(0, 3).join(", ")}.`);
  }

  return bits.join(" ") || "We read this project but couldn't work out its shape.";
}

/* ----------------------------------------------------------------- layout */

/**
 * Deliberately small. The people using Codarc mostly can't read the code, so
 * forty boxes is worse than fifteen — the sidebar still lists everything and
 * we say plainly when the canvas is showing a subset.
 */
const CAPS: Record<NodeKind, number> = {
  screen: 8,
  door: 16,
  logic: 12,
  data: 12,
};

function layout(nodes: GraphNode[], edges: GraphEdge[]) {
  const byKind = new Map<NodeKind, GraphNode[]>();
  for (const k of KIND_ORDER) byKind.set(k, []);
  for (const n of nodes) byKind.get(n.kind)!.push(n);

  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    const list = incoming.get(e.to) ?? [];
    list.push(e.from);
    incoming.set(e.to, list);
  }

  const rowOf = new Map<string, number>();
  const columns = KIND_ORDER.filter((k) => byKind.get(k)!.length);

  columns.forEach((kind, col) => {
    const list = byKind.get(kind)!;
    if (col === 0) {
      list.sort(
        (a, b) =>
          (a.feature ?? "~").localeCompare(b.feature ?? "~") ||
          a.title.localeCompare(b.title),
      );
    } else {
      // Barycentre: sit each node next to whatever points at it. Feature wins
      // the tie, so a repo's Reddit pieces end up on the same rows rather than
      // scattered down three columns.
      const weight = (n: GraphNode) => {
        const parents = (incoming.get(n.id) ?? [])
          .map((id) => rowOf.get(id))
          .filter((v): v is number => v !== undefined);
        return parents.length
          ? parents.reduce((a, b) => a + b, 0) / parents.length
          : Number.MAX_SAFE_INTEGER;
      };
      list.sort(
        (a, b) =>
          weight(a) - weight(b) ||
          (a.feature ?? "~").localeCompare(b.feature ?? "~") ||
          a.title.localeCompare(b.title),
      );
    }
    list.forEach((n, row) => rowOf.set(n.id, row));
  });

  // A repo with twenty routes would otherwise be one very tall, very thin
  // strip that only fits on screen at 40%. Wrap each band into sub-columns so
  // the map stays close to landscape and stays readable.
  const MAX_ROWS = 9;
  const SUB_GAP = 28;

  const bands = columns.map((kind) => {
    const list = byKind.get(kind)!;
    const chunks: GraphNode[][] = [];
    for (let i = 0; i < list.length; i += MAX_ROWS) {
      chunks.push(list.slice(i, i + MAX_ROWS));
    }
    return chunks.length ? chunks : [[]];
  });

  const tallest = Math.max(
    ...bands.flat().map((c) => c.length),
    1,
  );

  let cursorX = 0;
  bands.forEach((chunks, bandIndex) => {
    if (bandIndex > 0) cursorX += COL_GAP;
    chunks.forEach((chunk, chunkIndex) => {
      if (chunkIndex > 0) cursorX += SUB_GAP;
      const offset = ((tallest - chunk.length) * (NODE_H + ROW_GAP)) / 2;
      chunk.forEach((n, row) => {
        n.x = cursorX;
        n.y = offset + row * (NODE_H + ROW_GAP);
      });
      cursorX += NODE_W;
    });
  });
}

/* ------------------------------------------------------------------- main */

export async function analyzeRepo(
  owner: string,
  repo: string,
  /** Only for a private repository, and only once access has been checked. */
  repoToken?: string,
): Promise<RepoMap> {
  const meta = await fetchRepoMeta(owner, repo, repoToken);
  const { entries, truncated } = await fetchTree(owner, repo, meta.defaultBranch, repoToken);
  const paths = pickFiles(entries);
  const files = await fetchFiles(owner, repo, meta.defaultBranch, paths, repoToken);

  const resolve = makeResolver(new Set(files.keys()));

  const found: Found[] = [];
  const importGraph = new Map<string, Set<string>>();

  for (const [path, src] of files) {
    const isPy = /\.py$/i.test(path);

    if (isPy) {
      found.push(...pyRoutes(path, src), ...pyShapes(path, src));
    } else {
      found.push(...tsRoutes(path, src), ...tsScreens(path), ...tsShapes(path, src));
    }

    const logic = logicNode(path, src);
    if (logic) found.push(logic);

    const targets = new Set<string>();
    for (const spec of imports(path, src)) {
      const hit = resolve(path, spec);
      if (hit && hit !== path) targets.add(hit);
    }
    importGraph.set(path, targets);
  }

  // A file can't be both a door and shared logic — the door wins.
  const doorFiles = new Set(found.filter((f) => f.kind === "door").map((f) => f.file));
  const screenFiles = new Set(found.filter((f) => f.kind === "screen").map((f) => f.file));
  let candidates = found.filter(
    (f) => f.kind !== "logic" || (!doorFiles.has(f.file) && !screenFiles.has(f.file)),
  );

  // Deduplicate by id.
  const seen = new Set<string>();
  candidates = candidates.filter((f) => !seen.has(f.id) && seen.add(f.id));

  // How many other scanned files reach each file — our relevance signal.
  const referenceCount = new Map<string, number>();
  for (const [, targets] of importGraph) {
    for (const t of targets) {
      referenceCount.set(t, (referenceCount.get(t) ?? 0) + 1);
    }
  }

  const foundCounts: Record<NodeKind, number> = {
    screen: 0,
    door: 0,
    logic: 0,
    data: 0,
  };
  for (const c of candidates) foundCounts[c.kind]++;

  const kept: Found[] = [];
  for (const kind of KIND_ORDER) {
    const list = candidates
      .filter((f) => f.kind === kind)
      .sort(
        (a, b) =>
          (referenceCount.get(b.file) ?? 0) - (referenceCount.get(a.file) ?? 0) ||
          a.file.localeCompare(b.file),
      )
      .slice(0, CAPS[kind]);
    kept.push(...list);
  }

  const nodes: GraphNode[] = kept.map((f) => ({
    ...f,
    feature: featureOf(f.file, f.code) ?? undefined,
    summary:
      f.kind === "logic"
        ? logicSummary(f.code, referenceCount.get(f.file) ?? 0)
        : f.summary,
    related: [...(importGraph.get(f.file) ?? [])].slice(0, 4),
    dependents: [],
    x: 0,
    y: 0,
  }));


  // Three boxes all called "Shared logic" reads as broken software. Where a
  // title repeats, find the word that actually distinguishes them — a path
  // segment one has and the others don't — and put that in the name.
  const byTitle = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const list = byTitle.get(n.title) ?? [];
    list.push(n);
    byTitle.set(n.title, list);
  }

  const wordsOf = (n: GraphNode) =>
    new Set(
      `${n.code} ${n.file}`
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2 && !/^(api|get|post|put|patch|delete|src|app|the|route|index|ts|tsx|js|py)$/.test(w)),
    );

  for (const [, group] of byTitle) {
    if (group.length < 2) continue;
    const sets = group.map(wordsOf);

    group.forEach((n, i) => {
      const mine = sets[i];
      const others = sets.filter((_, j) => j !== i);
      const unique = [...mine].find((w) => others.every((o) => !o.has(w)));

      const qualifier =
        unique ??
        n.feature ??
        n.file.split("/").slice(-2, -1)[0] ??
        null;
      if (!qualifier) return;
      if (n.title.toLowerCase().includes(qualifier.toLowerCase())) return;

      const pretty = qualifier.replace(/[_-]+/g, " ");
      n.title = `${n.title} · ${pretty.charAt(0).toUpperCase()}${pretty.slice(1)}`;
    });
  }

  const featureTally = new Map<string, number>();
  for (const n of nodes) {
    if (!n.feature) continue;
    featureTally.set(n.feature, (featureTally.get(n.feature) ?? 0) + 1);
  }
  const features = [...featureTally]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  const rank = new Map(KIND_ORDER.map((k, i) => [k, i]));
  const nodesByFile = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const list = nodesByFile.get(n.file) ?? [];
    list.push(n);
    nodesByFile.set(n.file, list);
  }

  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];
  for (const [file, targets] of importGraph) {
    const froms = nodesByFile.get(file);
    if (!froms) continue;
    for (const target of targets) {
      const tos = nodesByFile.get(target);
      if (!tos) continue;
      for (const from of froms) {
        for (const to of tos) {
          // Keep the story flowing left to right; drop the rest.
          if (rank.get(to.kind)! <= rank.get(from.kind)!) continue;
          const key = `${from.id}->${to.id}`;
          if (edgeSet.has(key)) continue;
          edgeSet.add(key);
          edges.push({ from: from.id, to: to.id });
        }
      }
    }
  }

  // Blast radius is answered from every edge we found, not the handful we
  // choose to draw. Recorded here, before the trim below.
  const dependentsOf = new Map<string, Set<string>>();
  for (const e of edges) {
    const set = dependentsOf.get(e.to) ?? new Set<string>();
    set.add(e.from);
    dependentsOf.set(e.to, set);
  }
  for (const n of nodes) {
    n.dependents = [...(dependentsOf.get(n.id) ?? [])];
  }

  // A file with five routes importing four helpers yields twenty lines, which
  // reads as noise. Keep each node's strongest few connections instead.
  const MAX_OUT = 2;
  const outgoing = new Map<string, GraphEdge[]>();
  for (const e of edges) {
    const list = outgoing.get(e.from) ?? [];
    list.push(e);
    outgoing.set(e.from, list);
  }
  const trimmed: GraphEdge[] = [];
  for (const [, list] of outgoing) {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    list.sort(
      (a, b) =>
        (referenceCount.get(byId.get(b.to)?.file ?? "") ?? 0) -
        (referenceCount.get(byId.get(a.to)?.file ?? "") ?? 0),
    );
    trimmed.push(...list.slice(0, MAX_OUT));
  }

  layout(nodes, trimmed);

  return {
    owner,
    repo,
    overview: writeOverview(nodes, features, detectStacks(files, paths)),
    features,
    branch: meta.defaultBranch,
    description: meta.description,
    isPrivate: meta.isPrivate,
    stacks: detectStacks(files, paths),
    nodes,
    edges: trimmed,
    stats: {
      filesScanned: files.size,
      filesTotal: entries.length,
      truncated,
      found: foundCounts,
    },
  };
}
