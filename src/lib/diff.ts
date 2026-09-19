export type DiffLine = {
  type: "context" | "add" | "remove";
  text: string;
  /** 1-based line number in the original file, for removals and context. */
  before?: number;
  /** 1-based line number in the new file, for additions and context. */
  after?: number;
};

export type DiffHunk = { lines: DiffLine[] };

const CONTEXT = 3;

/**
 * A deliberately small line differ.
 *
 * Edits arrive as exact find/replace pairs, so the changed region is already
 * contiguous — trimming the shared head and tail is enough to find it, and it
 * avoids pulling in a diffing dependency for a preview panel.
 */
export function lineDiff(before: string, after: string): DiffHunk[] {
  const a = before.split("\n");
  const b = after.split("\n");

  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;

  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail++;
  }

  if (head === a.length && a.length === b.length) return [];

  const removed = a.slice(head, a.length - tail);
  const added = b.slice(head, b.length - tail);

  const lines: DiffLine[] = [];

  const ctxStart = Math.max(0, head - CONTEXT);
  for (let i = ctxStart; i < head; i++) {
    lines.push({ type: "context", text: a[i], before: i + 1, after: i + 1 });
  }

  removed.forEach((text, i) =>
    lines.push({ type: "remove", text, before: head + i + 1 }),
  );
  added.forEach((text, i) =>
    lines.push({ type: "add", text, after: head + i + 1 }),
  );

  const ctxEnd = Math.min(a.length, a.length - tail + CONTEXT);
  for (let i = a.length - tail; i < ctxEnd; i++) {
    lines.push({
      type: "context",
      text: a[i],
      before: i + 1,
      after: i - removed.length + added.length + 1,
    });
  }

  return [{ lines }];
}

export function countChanges(hunks: DiffHunk[]) {
  let added = 0;
  let removed = 0;
  for (const h of hunks) {
    for (const l of h.lines) {
      if (l.type === "add") added++;
      if (l.type === "remove") removed++;
    }
  }
  return { added, removed };
}
