import type { DiffHunk } from "@/lib/diff";
import { cn } from "@/lib/cn";

export type ProposalView = {
  summary: string;
  caveat: string;
  added: number;
  removed: number;
  files: { path: string; hunks: DiffHunk[]; added: number; removed: number }[];
};

/**
 * The diff is shown to someone who can't read code, so the plain summary
 * carries the meaning and this is the evidence underneath it. Colour does the
 * work; we don't rely on the +/- glyphs alone.
 */
export function DiffView({ proposal }: { proposal: ProposalView }) {
  return (
    <div className="space-y-3">
      {proposal.files.map((file) => (
        <div key={file.path} className="overflow-hidden rounded-md bg-code">
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-secondary">
              {file.path}
            </span>
            <span className="shrink-0 font-mono text-[10.5px] text-c-green">
              +{file.added}
            </span>
            <span className="shrink-0 font-mono text-[10.5px] text-c-red">
              −{file.removed}
            </span>
          </div>

          <div className="overflow-x-auto pb-1">
            {file.hunks.map((hunk, hi) => (
              <div key={hi}>
                {hunk.lines.map((line, li) => (
                  <div
                    key={li}
                    className={cn(
                      "flex gap-2 px-2.5 font-mono text-[11px] leading-[1.7] whitespace-pre",
                      line.type === "add" && "bg-c-green-bg text-c-green",
                      line.type === "remove" && "bg-c-red-bg text-c-red",
                      line.type === "context" && "text-tertiary",
                    )}
                  >
                    <span className="w-2.5 shrink-0 select-none opacity-70">
                      {line.type === "add"
                        ? "+"
                        : line.type === "remove"
                          ? "−"
                          : " "}
                    </span>
                    <span>{line.text || " "}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
