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
type Cursor = { x: number; y: number; at: number };

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

export function useLiveCursors(owner: string, repo: string, active = true) {
  const [config, setConfig] = React.useState<Presence>({ enabled: false });
  const [people, setPeople] = React.useState<Person[]>([]);
  const [cursors, setCursors] = React.useState<Record<number, Cursor>>({});

  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const lastSent = React.useRef(0);
  const pending = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ask the server whether this person gets a room at all.
  React.useEffect(() => {
    if (!active) return;
    let live = true;
    fetch(`/api/presence?repo=${encodeURIComponent(`${owner}/${repo}`)}`)
      .then((r) => r.json())
      .then((c: Presence) => {
        if (live) setConfig(c);
      })
      .catch(() => {});
    return () => {
      live = false;
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
        setCursors((prev) => {
          const next = { ...prev };
          if (x === null || y === null) delete next[id];
          else next[id] = { x, y, at: Date.now() };
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await channel.track(me);
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
            <div
              className="mt-0.5 ml-3 flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 shadow-popover"
              style={{ background: colour }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.avatar}
                alt=""
                width={20}
                height={20}
                className="size-5 rounded-full ring-2 ring-white/90"
              />
              <span className="text-[11.5px] font-medium whitespace-nowrap text-white">
                {p.name}
              </span>
            </div>
          </div>
        );
      }),
    [others, cursors, colours],
  );

  return {
    enabled: config.enabled,
    me,
    people,
    colours,
    onWorldPointer: config.enabled ? onWorldPointer : undefined,
    renderCursors: config.enabled ? renderCursors : undefined,
  };
}

/** Round faces for everyone in the room, each ringed in their cursor colour. */
export function PresenceStack({
  people,
  colours,
  meId,
}: {
  people: Person[];
  colours: Map<number, string>;
  meId?: number;
}) {
  // Alone in the room, there's nothing worth showing.
  if (people.length < 2) return null;

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
