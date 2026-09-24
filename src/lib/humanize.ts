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

/**
 * Screens people know by what they're for, not by their address. A page at
 * /auth/update-password is "Change your password" to everyone alive.
 */
const SCREENS: { match: RegExp; title: string }[] = [
  { match: /^\/?(auth|login|signin|sign-in)\/?$/, title: "Sign in" },
  { match: /(signup|sign-up|register|join)/, title: "Create an account" },
  { match: /(forgot|reset).*(password)?|password.*(reset|forgot)/, title: "Forgot your password" },
  { match: /(update|change|new).*password|password.*(update|change)/, title: "Change your password" },
  { match: /(verify|confirm)/, title: "Confirm your email" },
  { match: /^\/?(dashboard|home|app)\/?$/, title: "Your dashboard" },
  { match: /(settings|preferences|profile\/edit)/, title: "Settings" },
  { match: /(pricing|plans)/, title: "Pricing" },
  { match: /(checkout|billing|subscribe)/, title: "Paying" },
  { match: /(onboarding|welcome|getting-started)/, title: "Getting started" },
];

export function screenTitle(routePath: string): string {
  const path = routePath || "/";
  if (path === "/") return "Home page";

  const known = SCREENS.find((s) => s.match.test(path.toLowerCase()));
  if (known) return `${known.title} page`;

  // The last part of the address that means anything: "/r/:owner/:repo/handover"
  // is the handover page, not the "r" page.
  const last = path
    .split("/")
    .filter((s) => s && !s.startsWith(":") && !/^[{[]/.test(s) && s.length > 2)
    .pop();
  const subject = last ? words(last) : pathSubject(path);
  if (subject === "the home page") return "Home page";

  // A one-letter folder (/c/:id) tells a person nothing; don't pretend.
  const bare = subject.replace(/^the /, "");
  if (bare.length <= 2) return addressesOne(path) ? "One item page" : "A short-link page";

  const pretty = `${subject.charAt(0).toUpperCase()}${subject.slice(1)}`;
  // "/collections" lists them; "/collections/:id" shows one. Without this the
  // two end up with the same name and the map looks duplicated.
  return addressesOne(path) ? `One ${pretty.toLowerCase()} page` : `${pretty} page`;
}

export function screenSummary(routePath: string): string {
  const path = routePath || "/";
  return addressesOne(path)
    ? `One of these, opened from a list. Its address is ${path}.`
    : `A page people can open at ${path}.`;
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
  supabase: "Supabase", firebase: "Firebase", clerk: "Clerk", auth0: "Auth0",
  planetscale: "PlanetScale", neon: "Neon", vercel: "Vercel", netlify: "Netlify",
  resend: "Resend", sendgrid: "SendGrid", twilio: "Twilio", cloudinary: "Cloudinary",
  algolia: "Algolia", anthropic: "Claude", claude: "Claude", gemini: "Gemini",
  notion: "Notion", airtable: "Airtable", shopify: "Shopify", spotify: "Spotify",
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
    // Words before the job word are its subject. Drop the ones that are job
    // names themselves — "/connect/reddit/callback" is about Reddit, not about
    // connecting — but keep them if that would leave nothing at all, because
    // "/ai/health" really is the health of the AI.
    const leading = parts.slice(0, i).filter((w) => !PLUMBING.test(w));
    const trimmed = leading.filter((w) => !isJobWord(w));
    const before = (trimmed.length ? trimmed : leading)
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

/* ---------------------------------------------------------------------------
   The parts nobody sees.

   These files have no address and no screen, so their own name is all there
   is to go on — and "supabase/server.ts" means nothing to someone who has
   never written code. What follows works out the *job* instead: what it does
   for the person using the app, said the way they'd say it.
--------------------------------------------------------------------------- */

type Job = {
  match: RegExp;
  weight: number;
  /** Skip this job unless an outside company's name was found too. */
  needsBrand?: boolean;
  title: (brand: string | null) => string;
  summary: (brand: string | null) => string;
};

/** Jobs that appear in nearly every app, in the words a customer would use. */
const JOBS: Job[] = [
  {
    match: /^(supabase|prisma|drizzle|mongoose|sequelize|typeorm|postgres|postgresql|mysql|sqlite|mongo|mongodb|db|database|sql)$/,
    weight: 9,
    title: () => "Your saved information",
    summary: () => "How your app saves things and reads them back later.",
  },
  {
    match: /^(auth|authentication|session|sessions|login|signin|signup|account|accounts|user|users|identity|clerk|nextauth|jwt|token|tokens)$/,
    weight: 8,
    title: (brand) => (brand ? `Signing in with ${brand}` : "Knowing who's signed in"),
    summary: (brand) =>
      brand
        ? `Lets people sign in with their ${brand} account, and remembers them afterwards.`
        : "Checks who someone is and keeps them signed in while they move around your app.",
  },
  {
    match: /^(env|config|configuration|settings|constants?|secrets?)$/,
    weight: 8,
    title: (brand) => (brand ? `Your ${brand} settings` : "Your app's settings"),
    summary: (brand) =>
      brand
        ? `The keys and settings your app needs to work with ${brand}.`
        : "The settings and secret keys your app needs, kept in one place instead of scattered about.",
  },
  {
    match: /^(mail|mails|email|emails|mailer|resend|sendgrid|postmark|nodemailer|smtp)$/,
    weight: 8,
    title: () => "Sending email",
    summary: () => "Writes and sends the emails your app sends people.",
  },
  {
    match: /^(stripe|billing|payment|payments|checkout|subscription|subscriptions|paddle|lemonsqueezy)$/,
    weight: 8,
    title: () => "Taking payments",
    summary: () => "Handles paying, plans and receipts.",
  },
  {
    match: /^(upload|uploads|storage|s3|bucket|blob|files?|media)$/,
    weight: 7,
    title: () => "Files people upload",
    summary: () => "Takes in pictures and files and keeps them somewhere safe.",
  },
  {
    match: /^(cache|redis|memcached)$/,
    weight: 7,
    title: () => "Remembering answers",
    summary: () => "Keeps recent answers so the same thing doesn't have to be worked out twice.",
  },
  {
    match: /^(queue|queues|worker|workers|job|jobs|cron|schedule|scheduler|task|tasks|celery)$/,
    weight: 7,
    title: () => "Background work",
    summary: () => "Jobs that run on their own, without anyone waiting for them.",
  },
  {
    match: /^(state|store|stores|context|provider|providers|reducer|atoms?)$/,
    weight: 6,
    title: () => "What you're doing now",
    summary: () => "Keeps track of where you are and what you've picked while you use the app.",
  },
  {
    match: /^(error|errors|exception|exceptions|messages?)$/,
    weight: 6,
    title: () => "Plain error messages",
    summary: () => "When something goes wrong, this decides what people are told.",
  },
  {
    match: /^(valid|validate|validation|schema|schemas|zod|yup|joi|pydantic)$/,
    weight: 6,
    title: () => "Checking what's typed",
    summary: () => "Makes sure what someone fills in makes sense before your app acts on it.",
  },
  {
    match: /^(analytics|telemetry|tracking|metrics|posthog|mixpanel|segment|amplitude)$/,
    weight: 7,
    title: () => "Counting what people do",
    summary: () => "Records which parts get used, so you can see what's working.",
  },
  {
    match: /^(log|logger|logging|sentry)$/,
    weight: 7,
    title: () => "A record of problems",
    summary: () => "Writes down what went wrong, so it can be looked at afterwards.",
  },
  {
    match: /^(theme|styles?|styling|css|cx|cn|clsx|classnames|tailwind|tw)$/,
    weight: 5,
    title: () => "How things look",
    summary: () => "A small helper the whole app uses to keep its look consistent.",
  },
  {
    match: /^(date|dates|time|times|format|formats|formatting|currency|number|numbers|humanize)$/,
    weight: 5,
    title: () => "Dates and numbers",
    summary: () => "Turns dates, numbers and other raw values into something readable.",
  },
  {
    match: /^(search|searching|index|indexing|algolia|meilisearch|elastic)$/,
    weight: 6,
    title: () => "Searching",
    summary: () => "Finds things across your app when someone searches.",
  },
  {
    match: /^(notification|notifications|notify|push|webhook|webhooks)$/,
    weight: 6,
    title: () => "Letting people know",
    summary: () => "Sends the alerts and updates people get.",
  },
  {
    match: /^(permission|permissions|access|role|roles|guard|policy|policies)$/,
    weight: 7,
    title: () => "Who can do what",
    summary: () => "Decides what each person is allowed to see and change.",
  },
  {
    // Only worth saying when we know who it's talking to. On its own,
    // "client.ts" says nothing a person could use.
    match: /^(api|client|http|fetch|request|requests|axios|sdk)$/,
    weight: 3,
    needsBrand: true,
    title: (brand) => `Talking to ${brand}`,
    summary: (brand) => `Everything your app says to ${brand}, and everything it hears back.`,
  },
];

const WORD_SPLIT = /[^a-z0-9]+/i;

/** Every word in a path, file name included, camelCase pulled apart. */
function pathWords(path: string): string[] {
  return path
    .replace(/\.(py|ts|tsx|js|jsx|mjs|cjs)$/i, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[/\\]/)
    .flatMap((part) => part.split(WORD_SPLIT))
    .map((w) => w.toLowerCase())
    .filter(Boolean);
}

/** Folder and file words that carry no meaning of their own. */
const NOISE =
  /^(src|app|lib|libs|server|serverside|core|common|shared|util|utils|helper|helpers|pages?|components?|modules?|services?|routes?|hooks?|use|new|old|main|index|internal|private|public|types?|interface|model|models|ts|tsx|js|jsx|py|v\d+)$/i;

/** An outside company's name, if the path or the code mentions one. */
function brandIn(words: string[]): string | null {
  for (const w of words) {
    const name = PROPER[w];
    // The entries that expand to a description ("the database") aren't brands.
    if (name && !name.startsWith("the ") && name !== "sign-in") return name;
  }
  return null;
}

/** Whatever this file seems to be *about*, e.g. "profile", "trail". */
function subjectIn(words: string[]): string | null {
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i];
    if (NOISE.test(w) || PROPER[w] || JOBS.some((j) => j.match.test(w))) continue;
    if (w.length < 2) continue;
    return singular(w);
  }
  return null;
}

/** What the code itself gives away, when the name doesn't say enough. */
function jobFromCode(src: string): Job | null {
  const has = (re: RegExp) => re.test(src);
  if (has(/\b(createClient|createServerClient|createBrowserClient|new Pool|createConnection)\b/)) {
    return JOBS[0];
  }
  if (has(/\b(cookies\(\)|getSession|signInWith|signOut|verifyToken|jwt\.)/)) return JOBS[1];
  if (has(/\bprocess\.env\.\w+/) && has(/export\s+const\s+\w+\s*=/)) return JOBS[2];
  return null;
}

/**
 * A title and a first sentence for a file with no address of its own.
 * `callers` is added separately, so the sentence stays about the job.
 */
export function behindTheScenes(path: string, src: string): { title: string; summary: string } {
  const words = pathWords(path);
  const brand = brandIn(words);
  // The file's own name is the best clue there is. "auth/error-messages.ts"
  // is about messages; the folder it sits in doesn't change that.
  const fileWords = new Set(pathWords(path.split("/").pop() ?? path));

  let best: { job: Job; score: number } | null = null;
  for (const word of words) {
    const job = JOBS.find((j) => j.match.test(word));
    if (!job || (job.needsBrand && !brand)) continue;
    const score = job.weight + (fileWords.has(word) ? 3 : 0);
    if (!best || score > best.score) best = { job, score };
  }
  const chosen = best?.job ?? jobFromCode(src);

  if (chosen) return { title: chosen.title(brand), summary: chosen.summary(brand) };

  // A React piece that runs in the browser: the part of a page that reacts.
  const isClientPiece =
    /^["']use client["']/m.test(src) || /Client\.(tsx|jsx)$/.test(path);
  const subject = subjectIn(words);

  if (isClientPiece) {
    return {
      title: subject ? `Inside the ${subject} screen` : "Inside a screen",
      summary: subject
        ? `What happens on the ${subject} screen as someone clicks and types.`
        : "What happens on the screen as someone clicks and types.",
    };
  }

  if (brand) {
    return {
      title: `Talking to ${brand}`,
      summary: `Everything your app says to ${brand}, and everything it hears back.`,
    };
  }

  if (subject) {
    return {
      title: `Shared ${subject} steps`,
      summary: `Work to do with ${subject} that more than one part of your app needs.`,
    };
  }

  return {
    title: "Shared steps",
    summary: "Small jobs used in several places, kept in one file so they match.",
  };
}

/** "24 other parts of your app use it." — added to the end of a summary. */
export function usedBy(callers: number): string {
  if (callers <= 0) return "Nothing else points at it yet.";
  if (callers === 1) return "One other part of your app uses it.";
  return `${callers} other parts of your app use it.`;
}

/** A short feature name, used to group related boxes together. */
export function featureOf(path: string, code: string): string | null {
  const from = [...meaningful(code), ...path.split("/")].map((s) =>
    s.replace(/\.(py|ts|tsx|js|jsx|mjs|cjs)$/i, "").toLowerCase(),
  );
  // Category first. Eight separate one-item groups, one per social network,
  // is worse than a single "Importing" group with eight things in it.
  for (const part of from) {
    if (/^(import|ingest)$/.test(part)) return "Importing";
    if (/^(export|download)$/.test(part)) return "Exporting";
    if (/^(auth|login|signin|signup|session|account|password)$/.test(part)) return "Accounts";
    if (/^(billing|payment|checkout|stripe|subscription)$/.test(part)) return "Payments";
    if (/^(dashboard|admin)$/.test(part)) return "Dashboard";
    if (/^(health|healthz|status|metrics)$/.test(part)) return "Health checks";
  }
  // Otherwise the outside service it talks to is the most useful label.
  for (const part of from) {
    const name = PROPER[part];
    // Skip the entries that expand to a description rather than a brand.
    if (name && !name.startsWith("the ") && !name.includes("-")) return name;
  }
  return null;
}
