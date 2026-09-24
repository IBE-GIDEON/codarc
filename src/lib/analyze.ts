import {
  BAND_BOTTOM,
  BAND_GAP,
  BAND_TOP,
  GAP_X,
  GAP_Y,
  KIND_ORDER,
  LAYER_LABEL,
  NODE_H,
  NODE_W,
  PER_ROW,
  type GraphEdge,
  type GraphNode,
  type Layer,
  type NodeKind,
  type RepoMap,
} from "@/lib/graph";
import {
  dataSummary,
  dataTitle,
  featureOf,
  behindTheScenes,
  usedBy,
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
  // `app/page.tsx` is the home page — the one page everybody starts on.
  // Requiring a folder in between quietly left it off every map.
  if (/(^|\/)app\/(.*\/)?page\.(tsx|jsx|js|ts)$/i.test(path)) {
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

/**
 * Addresses a page sends people to: links, buttons, redirects.
 *
 * This is the part of a map a person actually recognises — "the menu takes me
 * here, and from there to there". Nothing else in the code shows it, because
 * a link is just a string.
 */
function linksTo(src: string): string[] {
  const out: string[] = [];
  const patterns = [
    /\bhref\s*=\s*["'`](\/[^"'`\s?#]*)/g, // <Link href="/pricing">
    /\bhref\s*=\s*\{\s*["'`](\/[^"'`\s?#]*)/g, // href={"/pricing"}
    /\b(?:push|replace|redirect|navigate)\s*\(\s*["'`](\/[^"'`\s?#]*)/g, // router.push("/x")
    // Menus are often written as lists: ["Pricing", "/pricing"]. Any quoted
    // address counts, because every one is checked against the real pages
    // before it becomes a line on the map.
    /["'`](\/[a-z0-9\-/:[\]{}]*)["'`]/gi,
  ];
  for (const re of patterns) {
    for (let m; (m = re.exec(src)); ) out.push(m[1]);
  }
  return out;
}

/**
 * Addresses a page asks the app for behind the scenes — the fetch calls.
 * This is the step between "I clicked the button" and "something happened",
 * and nothing in the imports shows it.
 */
function callsTo(src: string): string[] {
  const out: string[] = [];
  const patterns = [
    /\bfetch\s*\(\s*[`"'](\/[^`"'\s?]*)/g,
    /\b(?:axios|http)\s*\.\s*\w+\s*\(\s*[`"'](\/[^`"'\s?]*)/g,
    /\buseSWR\s*\(\s*[`"'](\/[^`"'\s?]*)/g,
  ];
  for (const re of patterns) {
    for (let m; (m = re.exec(src)); ) out.push(m[1]);
  }
  return out;
}

/** "/Dashboard/Collections/" and "/dashboard/collections" are one address. */
function sameAddress(route: string): string {
  const cleaned = route
    .toLowerCase()
    .replace(/\/+$/, "")
    .replace(/\[(.+?)\]/g, ":$1")
    .replace(/\{(.+?)\}/g, ":$1");
  return cleaned || "/";
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
  // Named for the job it does, not for the file it lives in. The "used by N
  // parts" sentence is added later, once the whole graph is known.
  const { title, summary } = behindTheScenes(path, src);
  return {
    id: `logic:${path}`,
    kind: "logic",
    title,
    code: base,
    summary,
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
/**
 * How many of each to draw. Pages get the most room: they're what the map
 * opens on and the part people recognise, so leaving half of them out is
 * the one omission you'd actually notice.
 */
const CAPS: Record<NodeKind, number> = {
  screen: 14,
  door: 16,
  logic: 12,
  data: 12,
};

/**
 * Lays the map out in bands, read top to bottom: the pages someone opens,
 * what that sets off, the work behind it, and where things end up. Lines
 * only ever run downward, which is what keeps a map with forty boxes
 * readable — there is one direction, and it matches how people read.
 */
function layout(nodes: GraphNode[], edges: GraphEdge[]): Layer[] {
  const byKind = new Map<NodeKind, GraphNode[]>();
  for (const k of KIND_ORDER) byKind.set(k, []);
  for (const n of nodes) byKind.get(n.kind)!.push(n);

  const incoming = new Map<string, string[]>();
  for (const e of edges) {
    const list = incoming.get(e.to) ?? [];
    list.push(e.from);
    incoming.set(e.to, list);
  }

  const bands = KIND_ORDER.filter((k) => byKind.get(k)!.length);
  const placed = new Map<string, number>();

  // Order each band before placing it, so lines to the band above stay short.
  bands.forEach((kind, depth) => {
    const list = byKind.get(kind)!;
    if (depth === 0) {
      // The home page comes first, because that's where people start.
      const home = (n: GraphNode) => (n.kind === "screen" && n.code === "/" ? 0 : 1);
      list.sort(
        (a, b) =>
          home(a) - home(b) ||
          (a.feature ?? "~").localeCompare(b.feature ?? "~") ||
          a.title.localeCompare(b.title),
      );
    } else {
      // Barycentre: sit each box under whatever points at it. Feature breaks
      // the tie, so a repo's Reddit pieces line up instead of scattering.
      const weight = (n: GraphNode) => {
        const parents = (incoming.get(n.id) ?? [])
          .map((id) => placed.get(id))
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
    list.forEach((n, i) => placed.set(n.id, i % PER_ROW));
  });

  // Every band is as wide as the busiest one, so the bands stack into a
  // single shape rather than a ragged staircase.
  const widest = Math.max(
    ...bands.map((k) => Math.min(byKind.get(k)!.length, PER_ROW)),
    1,
  );
  const fullWidth = widest * NODE_W + (widest - 1) * GAP_X;

  const layers: Layer[] = [];
  let y = 0;

  for (const kind of bands) {
    const list = byKind.get(kind)!;
    const rows = Math.ceil(list.length / PER_ROW);

    list.forEach((n, i) => {
      const row = Math.floor(i / PER_ROW);
      const inRow = list.slice(row * PER_ROW, (row + 1) * PER_ROW).length;
      // Short rows sit centred under the full width, not jammed to the left.
      const rowWidth = inRow * NODE_W + (inRow - 1) * GAP_X;
      const startX = (fullWidth - rowWidth) / 2;
      n.x = startX + (i % PER_ROW) * (NODE_W + GAP_X);
      n.y = y + BAND_TOP + row * (NODE_H + GAP_Y);
    });

    const height = BAND_TOP + rows * (NODE_H + GAP_Y) - GAP_Y + BAND_BOTTOM;
    layers.push({
      kind,
      label: LAYER_LABEL[kind],
      x: -GAP_X,
      y,
      w: fullWidth + GAP_X * 2,
      h: height,
    });
    y += height + BAND_GAP;
  }

  return layers;
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

  /**
   * How much a page matters to someone using the app. Nothing else imports
   * the home page, so counting importers buries the very page everyone
   * starts on. Shallow addresses win instead, and "/" always survives.
   */
  const pageRank = (f: Found) => {
    const address = f.code || "/";
    if (address === "/") return 1000;
    const depth = address.split("/").filter(Boolean).length;
    const takesAnId = address.includes(":");
    return 100 - depth * 10 - (takesAnId ? 15 : 0);
  };

  const kept: Found[] = [];
  for (const kind of KIND_ORDER) {
    const list = candidates
      .filter((f) => f.kind === kind)
      .sort((a, b) =>
        kind === "screen"
          ? pageRank(b) - pageRank(a) || a.file.localeCompare(b.file)
          : (referenceCount.get(b.file) ?? 0) - (referenceCount.get(a.file) ?? 0) ||
            a.file.localeCompare(b.file),
      )
      .slice(0, CAPS[kind]);
    kept.push(...list);
  }

  const drawn: GraphNode[] = kept.map((f) => ({
    ...f,
    feature: featureOf(f.file, f.code) ?? undefined,
    related: [...(importGraph.get(f.file) ?? [])].slice(0, 4),
    dependents: [],
    x: 0,
    y: 0,
  }));

  /*
   * Behind-the-scenes files that do the same job are one thing to the person
   * looking at the map. Three boxes for the same database, told apart by the
   * file names underneath, is the map showing its workings instead of doing
   * its job. Fold them into one box that knows all its files.
   */
  const nodes: GraphNode[] = [];
  const sameJob = new Map<string, GraphNode>();
  for (const node of drawn) {
    const twin = node.kind === "logic" ? sameJob.get(node.title) : undefined;
    if (!twin) {
      if (node.kind === "logic") sameJob.set(node.title, node);
      nodes.push(node);
      continue;
    }

    // The file the rest of the app leans on most is the one to open.
    const busier = (referenceCount.get(node.file) ?? 0) > (referenceCount.get(twin.file) ?? 0);
    twin.alsoIn = [...(twin.alsoIn ?? []), busier ? twin.file : node.file];
    if (busier) {
      twin.file = node.file;
      twin.line = node.line;
      twin.code = node.code;
    }
    twin.related = [...new Set([...twin.related, ...node.related])].slice(0, 4);
  }

  for (const n of nodes) {
    if (n.kind !== "logic") continue;
    const callers = [n.file, ...(n.alsoIn ?? [])].reduce(
      (sum, file) => sum + (referenceCount.get(file) ?? 0),
      0,
    );
    n.summary = `${n.summary} ${usedBy(callers)}`.trim();
  }

  // Two boxes with one name still reads as broken. Where a title repeats
  // across different kinds, find the word that actually distinguishes them —
  // a path segment one has and the others don't — and put that in the name.
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
    // A merged box answers for every file folded into it, so lines drawn to
    // any of them arrive at the one box.
    for (const file of [n.file, ...(n.alsoIn ?? [])]) {
      const list = nodesByFile.get(file) ?? [];
      list.push(n);
      nodesByFile.set(file, list);
    }
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
          edges.push({ from: from.id, to: to.id, kind: "uses" });
        }
      }
    }
  }

  /*
   * Now the part people recognise: which page leads to which. A page's links
   * live in its own file and in the pieces it pulls in, so both are read.
   */
  const screenByAddress = new Map<string, GraphNode>();
  for (const n of nodes) {
    if (n.kind === "screen") screenByAddress.set(sameAddress(n.code), n);
  }

  /**
   * A link built at runtime — `/c/${id}` — leaves only its fixed start
   * behind. If exactly one page lives under that start, it's that page.
   */
  const startsPage = (address: string): GraphNode | undefined => {
    const prefix = sameAddress(address);
    if (prefix === "/") return undefined;
    const matches = [...screenByAddress].filter(([a]) => a.startsWith(`${prefix}/:`));
    return matches.length === 1 ? matches[0][1] : undefined;
  };

  /** A page, the pieces it pulls in, and the layouts wrapped around it. */
  const pageSources = (file: string): string[] => {
    const seen = new Set<string>([file]);
    // Two steps out: a page pulls in a header, the header holds the menu.
    let edge = [file];
    for (let depth = 0; depth < 2; depth++) {
      const next: string[] = [];
      for (const from of edge) {
        for (const to of importGraph.get(from) ?? []) {
          if (seen.has(to)) continue;
          seen.add(to);
          next.push(to);
        }
      }
      edge = next;
    }

    // Layouts wrap pages without being imported by them, and that's where
    // the menu usually lives.
    const parts = file.split("/").slice(0, -1);
    for (let i = parts.length; i > 0; i--) {
      for (const ext of ["tsx", "jsx", "js", "ts"]) {
        const layout = `${parts.slice(0, i).join("/")}/layout.${ext}`;
        if (!files.has(layout) || seen.has(layout)) continue;
        seen.add(layout);
        for (const to of importGraph.get(layout) ?? []) seen.add(to);
      }
    }
    return [...seen];
  };

  const MAX_LINKS = 6;
  for (const page of nodes) {
    if (page.kind !== "screen") continue;

    const found: string[] = [];
    for (const file of pageSources(page.file)) {
      const src = files.get(file);
      if (src) found.push(...linksTo(src));
    }

    const seen = new Set<string>();
    for (const address of found) {
      const target = screenByAddress.get(sameAddress(address)) ?? startsPage(address);
      if (!target || target.id === page.id || seen.has(target.id)) continue;
      seen.add(target.id);
      if (seen.size > MAX_LINKS) break;
      const key = `${page.id}->${target.id}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ from: page.id, to: target.id, kind: "opens" });
    }

    // And what the page asks the app for while you're on it.
    const calls = new Set<string>();
    for (const file of pageSources(page.file)) {
      const src = files.get(file);
      if (src) for (const address of callsTo(src)) calls.add(sameAddress(address));
    }
    for (const address of calls) {
      for (const door of nodes) {
        if (door.kind !== "door") continue;
        const doorAddress = sameAddress(door.code.replace(/^\w+\s+/, ""));
        if (doorAddress !== address) continue;
        const key = `${page.id}->${door.id}`;
        if (edgeSet.has(key)) continue;
        edgeSet.add(key);
        edges.push({ from: page.id, to: door.id, kind: "uses" });
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
    // Where a page leads is never noise — that's the part people follow.
    // Only the behind-the-scenes lines get thinned out.
    const opens = list.filter((e) => e.kind === "opens");
    const uses = list.filter((e) => e.kind !== "opens");
    uses.sort(
      (a, b) =>
        (referenceCount.get(byId.get(b.to)?.file ?? "") ?? 0) -
        (referenceCount.get(byId.get(a.to)?.file ?? "") ?? 0),
    );
    trimmed.push(...opens, ...uses.slice(0, MAX_OUT));
  }

  const layers = layout(nodes, trimmed);

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
    layers,
    stats: {
      filesScanned: files.size,
      filesTotal: entries.length,
      truncated,
      found: foundCounts,
    },
  };
}
