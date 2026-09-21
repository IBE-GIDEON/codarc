/** "just now", "3 hours ago", "2 weeks ago" — how Notion talks about time. */
export function ago(when: string | number | null | undefined, now = Date.now()): string {
  if (when === null || when === undefined) return "";
  const then = typeof when === "number" ? when : Date.parse(when);
  if (Number.isNaN(then)) return "";

  const seconds = Math.max(0, Math.round((now - then) / 1000));
  const steps: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
    [Infinity, "year"],
  ];

  if (seconds < 45) return "just now";
  let value = seconds;
  for (const [size, unit] of steps) {
    if (value < size) {
      const n = Math.max(1, Math.round(value));
      return `${n} ${unit}${n === 1 ? "" : "s"} ago`;
    }
    value /= size;
  }
  return "";
}
