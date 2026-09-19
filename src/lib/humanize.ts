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
  return `${subject.charAt(0).toUpperCase()}${subject.slice(1)} page`;
}

export function screenSummary(routePath: string): string {
  return `A page people land on at ${routePath || "/"}.`;
}

/** "3 files" / "1 file" */
export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
