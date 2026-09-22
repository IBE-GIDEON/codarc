import "server-only";

/**
 * A simple brake for the expensive endpoints: mapping reads a whole
 * repository from GitHub, and drafting spends real money on the AI.
 *
 * It lives in each server's memory, so on Vercel it's a per-instance limit —
 * a guard against runaway loops and someone hammering a button, not a wall
 * against a determined attacker. The monthly change allowance in the
 * database is the real limit on spending.
 */

const windows = new Map<string, number[]>();

export function allow(key: string, max: number, perMs: number): boolean {
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((t) => now - t < perMs);
  if (recent.length >= max) {
    windows.set(key, recent);
    return false;
  }
  recent.push(now);
  windows.set(key, recent);

  // Don't let the map grow forever on a long-lived instance.
  if (windows.size > 5000) {
    for (const [k, times] of windows) {
      if (times.every((t) => now - t >= perMs)) windows.delete(k);
    }
  }
  return true;
}

/** Best guess at who's asking, for requests without a signed-in user. */
export function clientKey(request: Request): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
