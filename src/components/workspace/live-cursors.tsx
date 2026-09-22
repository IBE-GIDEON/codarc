"use client";

import * as React from "react";
import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Live cursors for Studio teams — everyone on the same map sees everyone
 * else's pointer, each in its own colour with their face on it.
 *
 * Positions travel in map coordinates, not screen ones, so two people zoomed
 * and panned differently still agree on which box a cursor is pointing at.
 */

type Person = { id: number; login: string; name: string; avatar: string };
type Cursor = {
  x: number;
  y: number;
  /** Last movement. */
  at: number;
  /** When the name bubble last popped up. */
  labelAt: number;
};

type Presence = {
  enabled: boolean;
  url?: string;
  anonKey?: string;
  channel?: string;
  me?: Person;
};

/** Eight colours that all carry white text. A Studio team is at most five. */
const PALETTE = [
  "#E5484D",
  "#0090FF",
  "#30A46C",
  "#8E4EC6",
  "#F76B15",
  "#D6409F",
  "#12A594",
  "#5B5BD6",
];

/**
 * Everyone gets a colour of their own, and everyone's screen agrees on it.
 * Each person prefers the slot their id points at; a clash moves the later id
 * to the next free slot. So colours stay put as people come and go, and two
 * people never share one.
 */
function assignColours(ids: number[]): Map<number, string> {
  const taken = new Set<number>();
  const out = new Map<number, string>();
  for (const id of [...ids].sort((a, b) => a - b)) {
    let slot = id % PALETTE.length;
    while (taken.has(slot) && taken.size < PALETTE.length) {
      slot = (slot + 1) % PALETTE.length;
    }
    taken.add(slot);
    out.set(id, PALETTE[slot]);
  }
  return out;
}

const SEND_EVERY_MS = 45;
const STALE_MS = 8000;
/** How often an open map re-checks who's allowed in. */
const RECHECK_MS = 15_000;
/** The name bubble: how long it stays, and what brings it back. */
const LABEL_MS = 2500;
const LABEL_AFTER_IDLE_MS = 4000;
const LABEL_EVERY_MS = 25_000;

export function useLiveCursors(owner: string, repo: string, active = true) {
  const [config, setConfig] = React.useState<Presence>({ enabled: false });
  const [people, setPeople] = React.useState<Person[]>([]);
  // Said out loud on the map, so "no cursors" is never a mystery.
  const [status, setStatus] = React.useState<"connecting" | "live" | "failed">("connecting");
  const [cursors, setCursors] = React.useState<Record<number, Cursor>>({});
  // Nudges a redraw when a name bubble's time is up, even if nobody moved.
  const [tick, bump] = React.useReducer((n: number) => n + 1, 0);

  // The config we last acted on, for comparing new answers against.
  const configRef = React.useRef<Presence>({ enabled: false });
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const lastSent = React.useRef(0);
  const pending = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ask the server whether this person gets a room, and which one — then keep
  // asking. Someone removed from the team drops out within seconds; someone
  // added, or a room that moved because the team changed, is picked up the
  // same way. Only a real change reconnects, so the steady state is silent.
  React.useEffect(() => {
    if (!active) return;
    let live = true;
    const url = `/api/presence?repo=${encodeURIComponent(`${owner}/${repo}`)}`;
    const load = () =>
      fetch(url, { cache: "no-store" })
        .then((r) => r.json())
        .then((c: Presence) => {
          if (!live) return;
          const prev = configRef.current;
          const same =
            prev.enabled === c.enabled &&
            prev.channel === c.channel &&
            prev.me?.name === c.me?.name &&
            prev.me?.avatar === c.me?.avatar;
          if (same) return;
          configRef.current = c;
          // A different room (or none): start clean rather than show people
          // and cursors from the old one.
          setStatus("connecting");
          setPeople([]);
          setCursors({});
          setConfig(c);
        })
        .catch(() => {});
    load();
    const timer = window.setInterval(load, RECHECK_MS);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [owner, repo, active]);

  React.useEffect(() => {
    if (!config.enabled || !config.url || !config.anonKey || !config.channel || !config.me) {
      return;
    }
    const me = config.me;

    const client: SupabaseClient = createClient(config.url, config.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const channel = client.channel(config.channel, {
      config: {
        presence: { key: String(me.id), enabled: true },
        broadcast: { self: false },
      },
    });
    channelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Person>();
        const everyone = Object.values(state)
          .map((entries) => entries[0])
          .filter(Boolean)
          .map((p) => ({ id: p.id, login: p.login, name: p.name, avatar: p.avatar }));
        setPeople(everyone);

        // Drop cursors for anyone who has left.
        const here = new Set(everyone.map((p) => p.id));
        setCursors((prev) => {
          const next: Record<number, Cursor> = {};
          for (const [id, c] of Object.entries(prev)) {
            if (here.has(Number(id))) next[Number(id)] = c;
          }
          return next;
        });
      })
      .on("broadcast", { event: "cursor" }, ({ payload }) => {
        const { id, x, y } = payload as { id: number; x: number | null; y: number | null };
        const now = Date.now();
        setCursors((prev) => {
          const next = { ...prev };
          if (x === null || y === null) {
            delete next[id];
            return next;
          }
          const before = prev[id];
          // The name pops up when someone arrives, starts moving again after
          // a pause, or every so often while they keep going — not constantly.
          const showName =
            !before ||
            now - before.at > LABEL_AFTER_IDLE_MS ||
            now - before.labelAt > LABEL_EVERY_MS;
          if (showName) window.setTimeout(bump, LABEL_MS + 50);
          next[id] = { x, y, at: now, labelAt: showName ? now : before.labelAt };
          return next;
        });
      })
      .subscribe(async (state) => {
        if (state === "SUBSCRIBED") {
          setStatus("live");
          await channel.track(me);
        } else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
          console.error("[live cursors]", state);
          setStatus("failed");
        }
      });

    // Someone whose tab went to sleep shouldn't leave a cursor frozen mid-map.
    const sweep = window.setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        let changed = false;
        const next: Record<number, Cursor> = {};
        for (const [id, c] of Object.entries(prev)) {
          if (now - c.at < STALE_MS) next[Number(id)] = c;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 2000);

    return () => {
      window.clearInterval(sweep);
      if (pending.current) clearTimeout(pending.current);
      channelRef.current = null;
      client.removeChannel(channel);
    };
  }, [config]);

  const me = config.me;

  /** Hand this to the canvas; it throttles itself. */
  const onWorldPointer = React.useCallback(
    (point: { x: number; y: number } | null) => {
      const channel = channelRef.current;
      if (!channel || !me) return;

      const send = () => {
        lastSent.current = Date.now();
        void channel.send({
          type: "broadcast",
          event: "cursor",
          payload: { id: me.id, x: point?.x ?? null, y: point?.y ?? null },
        });
      };

      if (pending.current) {
        clearTimeout(pending.current);
        pending.current = null;
      }
      // Leaving the canvas always goes out straight away.
      if (!point) return send();

      const wait = SEND_EVERY_MS - (Date.now() - lastSent.current);
      if (wait <= 0) send();
      else pending.current = setTimeout(send, wait);
    },
    [me],
  );

  const colours = React.useMemo(
    () => assignColours(people.map((p) => p.id)),
    [people],
  );

  const others = people.filter((p) => p.id !== me?.id);

  /** Rendered inside the map layer; `zoom` keeps each cursor screen-sized. */
  const renderCursors = React.useCallback(
    (zoom: number) =>
      others.map((p) => {
        const c = cursors[p.id];
        if (!c) return null;
        const colour = colours.get(p.id) ?? PALETTE[0];
        return (
          <div
            key={p.id}
            className="pointer-events-none absolute z-30"
            style={{
              left: c.x,
              top: c.y,
              transform: `scale(${1 / zoom})`,
              transformOrigin: "0 0",
              transition: "left 90ms linear, top 90ms linear",
            }}
          >
            <svg width="18" height="20" viewBox="0 0 18 20" className="drop-shadow-sm">
              <path
                d="M1 1 L1 16 L5.2 12.2 L8 18.5 L10.6 17.4 L7.9 11.2 L13.8 11.2 Z"
                fill={colour}
                stroke="white"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            {/* Their face stays by the arrow; the name is a small bubble that
                shows up now and then and fades — never a permanent banner. */}
            <div className="mt-0.5 ml-3 flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.avatar}
                alt=""
                width={16}
                height={16}
                className="size-4 shrink-0 rounded-full"
                style={{ boxShadow: `0 0 0 1.5px white, 0 0 0 3px ${colour}` }}
              />
              <span
                className="rounded-md px-1.5 py-0.5 text-[11px] leading-[1.3] font-medium whitespace-nowrap text-white shadow-popover"
                style={{
                  background: colour,
                  opacity: Date.now() - c.labelAt < LABEL_MS ? 1 : 0,
                  transition: "opacity 100ms ease-out",
                }}
              >
                {p.name}
              </span>
            </div>
          </div>
        );
      }),
    // `tick` so a fading name bubble redraws even when nobody moved.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [others, cursors, colours, tick],
  );

  return {
    enabled: config.enabled,
    status,
    me,
    people,
    colours,
    onWorldPointer: config.enabled ? onWorldPointer : undefined,
    renderCursors: config.enabled ? renderCursors : undefined,
  };
}

/**
 * Round faces for everyone in the room, each ringed in their cursor colour.
 * Alone, it says so — otherwise "I can't see my teammate" has no answer.
 */
export function PresenceStack({
  people,
  colours,
  meId,
  status,
}: {
  people: Person[];
  colours: Map<number, string>;
  meId?: number;
  status: "connecting" | "live" | "failed";
}) {
  if (status !== "live" || people.length < 2) {
    const me = people.find((p) => p.id === meId);
    const text =
      status === "failed"
        ? "Live cursors couldn't connect — reload to try again"
        : status === "connecting"
          ? "Connecting live cursors…"
          : "Only you here — teammates show up when they open this map";
    return (
      <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-raised/95 py-1 pr-3 pl-1 shadow-popover backdrop-blur-sm">
        {me ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={me.avatar}
            alt=""
            title={`${me.name} (you)`}
            width={22}
            height={22}
            className="size-[22px] rounded-full"
          />
        ) : (
          <span
            className="ml-1 size-2 rounded-full"
            style={{ background: status === "failed" ? "var(--c-red)" : "var(--text-ghost)" }}
          />
        )}
        <span className="text-[12px] text-tertiary">{text}</span>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-raised/95 py-1 pr-3 pl-1 shadow-popover backdrop-blur-sm">
      <div className="flex -space-x-1.5">
        {people.map((p) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.id}
            src={p.avatar}
            alt={p.name}
            title={p.id === meId ? `${p.name} (you)` : p.name}
            width={26}
            height={26}
            className="size-[26px] rounded-full"
            style={{ boxShadow: `0 0 0 2px var(--bg-raised), 0 0 0 4px ${colours.get(p.id)}` }}
          />
        ))}
      </div>
      <span className="text-[12px] text-secondary">
        {people.length} here now
      </span>
    </div>
  );
}
