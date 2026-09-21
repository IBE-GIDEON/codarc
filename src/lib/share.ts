import crypto from "node:crypto";
import zlib from "node:zlib";
import { env } from "@/lib/env";

/**
 * Shared maps.
 *
 * A read-only link to a map, exactly as its owner arranged it, that anyone can
 * open without an account — the thing you send a contractor, a co-founder or
 * an investor.
 *
 * No database: everything the viewer needs rides inside the link, compressed
 * and signed. The signature means nobody can edit a link to point it at a
 * different repository or pretend someone else shared it. The trade-off is
 * that one link can't be revoked on its own — rotating SESSION_SECRET kills
 * every link at once — and links expire after 90 days so that matters less.
 */

export type Offsets = Record<string, { dx: number; dy: number }>;

export type Share = {
  owner: string;
  repo: string;
  sharedBy: { name: string; login: string; avatar: string };
  sharedAt: number;
  note: string | null;
  /** A node to open on arrival — "look at this bit". */
  focus: string | null;
  /** The sharer's arrangement, so the viewer sees what they saw. */
  offsets: Offsets;
};

const VERSION = 1;
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_NOTE = 280;
const MAX_OFFSETS = 120;

/** Separate from the session signature so one can never stand in for the other. */
const DOMAIN = "codarc-share:";

type Wire = {
  v: number;
  o: string;
  r: string;
  b: [string, string, string];
  t: number;
  n?: string;
  f?: string;
  x?: [string, number, number][];
};

function secret() {
  const value = env("SESSION_SECRET");
  if (!value) throw new Error("SESSION_SECRET is not set");
  return value;
}

function sign(payload: string) {
  return crypto
    .createHmac("sha256", secret())
    .update(DOMAIN + payload)
    .digest("base64url");
}

export function canShare() {
  return Boolean(env("SESSION_SECRET"));
}

export function encodeShare(share: Share): string {
  // Only moved boxes travel — an untouched box needs no offset, and a map
  // with forty boxes and three nudges shouldn't carry forty entries.
  const moved = Object.entries(share.offsets)
    .filter(([, o]) => Math.round(o.dx) !== 0 || Math.round(o.dy) !== 0)
    .slice(0, MAX_OFFSETS)
    .map(([id, o]) => [id, Math.round(o.dx), Math.round(o.dy)] as [string, number, number]);

  const wire: Wire = {
    v: VERSION,
    o: share.owner,
    r: share.repo,
    b: [share.sharedBy.name, share.sharedBy.login, share.sharedBy.avatar],
    t: share.sharedAt,
  };
  if (share.note) wire.n = share.note.slice(0, MAX_NOTE);
  if (share.focus) wire.f = share.focus;
  if (moved.length) wire.x = moved;

  const payload = zlib
    .deflateRawSync(Buffer.from(JSON.stringify(wire), "utf8"))
    .toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export type Decoded =
  | { ok: true; share: Share }
  | { ok: false; reason: "invalid" | "expired" };

export function decodeShare(token: string): Decoded {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return { ok: false, reason: "invalid" };

  let expected: string;
  try {
    expected = sign(payload);
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return { ok: false, reason: "invalid" };
  }

  let wire: Wire;
  try {
    wire = JSON.parse(
      zlib.inflateRawSync(Buffer.from(payload, "base64url")).toString("utf8"),
    ) as Wire;
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (wire.v !== VERSION || !wire.o || !wire.r) return { ok: false, reason: "invalid" };
  if (Date.now() - wire.t > MAX_AGE_MS) return { ok: false, reason: "expired" };

  const offsets: Offsets = {};
  for (const [id, dx, dy] of wire.x ?? []) offsets[id] = { dx, dy };

  return {
    ok: true,
    share: {
      owner: wire.o,
      repo: wire.r,
      sharedBy: { name: wire.b[0], login: wire.b[1], avatar: wire.b[2] },
      sharedAt: wire.t,
      note: wire.n ?? null,
      focus: wire.f ?? null,
      offsets,
    },
  };
}
