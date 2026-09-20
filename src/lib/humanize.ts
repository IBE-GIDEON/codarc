/**
 * Turns code-shaped names into sentences a non-developer can read.
 * Most Codarc customers shipped their app with AI and have never opened the
 * files, so every string that reaches the canvas goes through here first.
 */

const WORDY: Record<string, string> = {
  auth: "sign-in",
  login: "sign-in",
  signin: "sign-in",
  signup: "sign-up",
  register: "sign-up",
  logout: "sign-out",
  me: "the current account",
  user: "user",
  users: "users",
  billing: "billing",
  payment: "payment",
  payments: "payments",
  checkout: "checkout",
  subscription: "subscription",
  webhook: "an outside service's notification",
  hook: "an outside service's notification",
  upload: "file upload",
  api: "",
  v1: "",
  v2: "",
  index: "the main page",
};

const TITLES: Record<string, string> = {
  "post /auth/login": "Sign in",
  "post /login": "Sign in",
  "post /auth/signup": "Create an account",
  "post /auth/register": "Create an account",
  "post /register": "Create an account",
  "post /auth/logout": "Sign out",
  "get /auth/me": "Who am I",
  "get /me": "Who am I",
};

function words(segment: string) {
  return segment
    .replace(/[{}<>:[\]]/g, "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
}

/** "/api/v1/users/{id}" -> "users" */
export function pathSubject(path: string): string {
  const parts = path
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^[{:<[]/.test(s));

  const named = parts
    .map((p) => (p in WORDY ? WORDY[p] : words(p)))
    .filter(Boolean);

  if (!named.length) return "the home page";

  const two = named.slice(-2).join(" ");
  return two.length > 26 ? named[named.length - 1] : two;
}

const VERB: Record<string, (s: string) => string> = {
  GET: (s) => `Hands back ${s} whenever the app asks for it.`,
  POST: (s) => `Receives new ${s} and does something with it.`,
  PUT: (s) => `Replaces ${s} with an updated version.`,
  PATCH: (s) => `Changes part of ${s} without replacing all of it.`,
  DELETE: (s) => `Removes ${s} for good.`,
};

/** "/users/{id}" addresses one record; "/users" addresses the list. */
function addressesOne(path: string): boolean {
  const last = path.split("/").filter(Boolean).pop() ?? "";
  return /^[{:<[]/.test(last);
}

function singular(s: string): string {
  if (/(ss|us|is)$/i.test(s)) return s;
  return s.replace(/ies$/i, "y").replace(/s$/i, "");
}

export function routeTitle(method: string, path: string): string {
  const key = `${method.toLowerCase()} ${path.toLowerCase()}`;
  if (TITLES[key]) return TITLES[key];

  const one = addressesOne(path);
  const subject = one ? `one ${singular(pathSubject(path))}` : pathSubject(path);

  const lead: Record<string, string> = {
    GET: "Read",
    POST: "Create",
    PUT: "Replace",
    PATCH: "Update",
    DELETE: "Delete",
  };
  const verb = lead[method] ?? "Handle";
  return `${verb} ${subject}`.replace(/\s+/g, " ").trim();
}

export function routeSummary(method: string, path: string): string {
  const subject = pathSubject(path);
  const make = VERB[method];
  return make
    ? make(subject)
    : `Answers ${method} requests sent to ${path}.`;
}

/** "AuthService" / "auth_service.py" -> "Sign-in logic" */
export function logicTitle(name: string): string {
  const base = name
    .replace(/\.(py|ts|tsx|js|jsx|mjs|cjs)$/i, "")
    .replace(/(Service|Manager|Controller|Repository|Client|Handler|Provider|Util|Utils|Helpers?)$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();

  if (!base) return "Shared logic";
  const pretty = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
  return `${pretty} logic`;
}

export function logicSummary(name: string, callers: number): string {
  const who =
    callers === 0
      ? "Nothing else points at it yet."
      : callers === 1
        ? "One other part of your app relies on it."
        : `${callers} other parts of your app rely on it.`;
  return `Does the actual work behind the scenes. ${who}`;
}

export function dataTitle(name: string): string {
  const pretty = name
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return pretty.charAt(0).toUpperCase() + pretty.slice(1);
}

export function dataSummary(name: string): string {
  return `Describes what one ${dataTitle(name).toLowerCase()} record looks like when you store it.`;
}

export function screenTitle(routePath: string): string {
  const subject = pathSubject(routePath);
  if (subject === "the home page") return "Home page";
  const pretty = `${subject.charAt(0).toUpperCase()}${subject.slice(1)}`;
  // "/collections" lists them; "/collections/:id" shows one. Without this the
  // two end up with the same name and the map looks duplicated.
  return addressesOne(routePath) ? `One ${pretty.toLowerCase()} page` : `${pretty} page`;
}

export function screenSummary(routePath: string): string {
  return `A page people land on at ${routePath || "/"}.`;
}

/** "3 files" / "1 file" */
export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/* ---------------------------------------------------------------------------
   Purpose, not shape.

   "Create import reddit" is what a path looks like. "Import from Reddit" is
   what it does. Everything below exists to close that gap, because a customer
   who reads the first one decides this product isn't for them.
--------------------------------------------------------------------------- */

/** Names that deserve their capital letters back. */
const PROPER: Record<string, string> = {
  reddit: "Reddit", twitter: "Twitter", bluesky: "Bluesky", mastodon: "Mastodon",
  linkedin: "LinkedIn", lemmy: "Lemmy", devto: "Dev.to", hackernews: "Hacker News",
  github: "GitHub", gitlab: "GitLab", google: "Google", stripe: "Stripe",
  paypal: "PayPal", slack: "Slack", discord: "Discord", openai: "OpenAI",
  youtube: "YouTube", tiktok: "TikTok", instagram: "Instagram", facebook: "Facebook",
  whatsapp: "WhatsApp", telegram: "Telegram", rss: "RSS", ai: "AI", api: "",
  sms: "SMS", pdf: "PDF", csv: "CSV", oauth: "sign-in", jwt: "sign-in",
  db: "the database", database: "the database", redis: "the cache", cache: "the cache",
};

/**
 * Path segments that tell you the *job*, whatever the method says.
 *
 * `weight` decides which wins when a path contains several — "/api/ai/health"
 * is a health check that happens to be about AI, not an AI endpoint that
 * happens to be at /health. Leftmost-wins gets that backwards.
 */
const INTENT: {
  match: RegExp;
  weight: number;
  phrase: (subject: string) => string;
}[] = [
  { match: /^import|ingest$/, weight: 5, phrase: (s) => `Import from ${s || "somewhere"}` },
  { match: /^export|download$/, weight: 5, phrase: (s) => `Export ${s || "your data"}` },
  { match: /^connect|link$/, weight: 5, phrase: (s) => `Connect a ${s || "an"} account` },
  { match: /^disconnect|unlink$/, weight: 6, phrase: (s) => `Disconnect ${s || "an account"}` },
  { match: /^callback$/, weight: 9, phrase: (s) => `Finish connecting ${s || "an account"}` },
  { match: /^health|healthz|ping|status$/, weight: 9, phrase: (s) => `Check ${s || "the app"} is alive` },
  { match: /^webhook|hook$/, weight: 9, phrase: (s) => `Listen for ${s || "outside"} updates` },
  { match: /^search$/, weight: 5, phrase: (s) => `Search ${s || "everything"}` },
  { match: /^upload$/, weight: 5, phrase: () => "Upload a file" },
  { match: /^sync$/, weight: 5, phrase: (s) => `Keep ${s || "things"} in step` },
  { match: /^login|signin$/, weight: 7, phrase: () => "Sign in" },
  { match: /^logout|signout$/, weight: 7, phrase: () => "Sign out" },
  { match: /^signup|register$/, weight: 7, phrase: () => "Create an account" },
  { match: /^reset$/, weight: 7, phrase: () => "Reset a password" },
  { match: /^verify|confirm$/, weight: 7, phrase: (s) => `Confirm ${s || "an account"}` },
  { match: /^checkout|pay|payment|billing$/, weight: 6, phrase: () => "Take a payment" },
  { match: /^compose$/, weight: 5, phrase: () => "Write something new" },
  { match: /^ai|chat|complete|generate$/, weight: 1, phrase: () => "Ask the AI" },
];

/** Words that describe a mechanism, not a subject — never part of a name. */
const PLUMBING = /^(ingest|callback|handler|route|router|endpoint|index|new|edit)$/i;

function proper(word: string): string {
  const key = word.toLowerCase();
  if (key in PROPER) return PROPER[key];
  return word;
}

/** The meaningful, non-generic segments of a path, in order. */
function meaningful(path: string): string[] {
  return path
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^[{:<[]/.test(s))
    .filter((s) => !/^(api|v\d+|index|public|app|_)$/i.test(s));
}

/**
 * A title that says what the thing is for.
 * Returns null when nothing better than the generic phrasing is available.
 */
export function purposeTitle(method: string, path: string): string | null {
  const parts = meaningful(path);
  if (!parts.length) return null;

  let best: { rule: (typeof INTENT)[number]; at: number } | null = null;
  for (let i = 0; i < parts.length; i++) {
    const rule = INTENT.find((r) => r.match.test(parts[i].toLowerCase()));
    if (!rule) continue;
    if (!best || rule.weight > best.rule.weight) best = { rule, at: i };
  }

  {
    if (!best) return null;
    const { rule, at: i } = best;
    // Whatever follows the intent word is usually its subject.
    // A word that is itself a job name is never the subject of another one:
    // "/connect/reddit/callback" is about Reddit, not about connecting.
    const isJobWord = (w: string) =>
      PLUMBING.test(w) || INTENT.some((r) => r.match.test(w.toLowerCase()));

    const rest = parts
      .slice(i + 1)
      .filter((w) => !isJobWord(w))
      .map(proper)
      .filter(Boolean)
      .join(" ");
    const before = parts
      .slice(0, i)
      .filter((w) => !isJobWord(w))
      .map(proper)
      .filter(Boolean)
      .join(" ");
    return rule.phrase(rest || before);
  }
}

/**
 * When a file's own name is generic — client, server, index, utils — the
 * folder above it carries the meaning. Without this a repo ends up with three
 * boxes all called "Shared logic", which reads as broken.
 */
const GENERIC_FILE =
  /^(client|server|index|main|app|utils?|helpers?|common|shared|core|config|constants?|types?|lib)$/i;

export function logicTitleFromPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const base = (parts.pop() ?? path).replace(/\.(py|ts|tsx|js|jsx|mjs|cjs)$/i, "");

  if (!GENERIC_FILE.test(base)) return logicTitle(base);

  // Walk up for the nearest folder that actually means something.
  for (let i = parts.length - 1; i >= 0; i--) {
    const folder = parts[i];
    if (/^(src|app|lib|server|api|routes?|services?|components?|pages?)$/i.test(folder)) {
      continue;
    }
    const named = proper(folder);
    if (named) {
      const pretty = named.charAt(0).toUpperCase() + named.slice(1);
      return `${pretty} ${base.toLowerCase() === "client" ? "connection" : "logic"}`;
    }
  }
  return logicTitle(base);
}

/** A short feature name, used to group related boxes together. */
export function featureOf(path: string, code: string): string | null {
  const from = [...meaningful(code), ...path.split("/")].map((s) =>
    s.replace(/\.(py|ts|tsx|js|jsx|mjs|cjs)$/i, "").toLowerCase(),
  );
  for (const part of from) {
    if (part in PROPER && PROPER[part]) return PROPER[part];
  }
  for (const part of from) {
    if (/^(auth|login|signin|signup|session|account)$/.test(part)) return "Accounts";
    if (/^(billing|payment|checkout|stripe|subscription)$/.test(part)) return "Payments";
    if (/^(import|ingest)$/.test(part)) return "Importing";
    if (/^(dashboard|admin)$/.test(part)) return "Dashboard";
    if (/^(health|status|metrics)$/.test(part)) return "Health checks";
  }
  return null;
}
