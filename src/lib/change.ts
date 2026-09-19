import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { fetchFiles } from "@/lib/github";
import { countChanges, lineDiff, type DiffHunk } from "@/lib/diff";
import type { GraphNode } from "@/lib/graph";

export class ChangeError extends Error {
  constructor(
    message: string,
    readonly hint: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

const EditSchema = z.object({
  path: z.string(),
  find: z
    .string()
    .describe(
      "The exact snippet to replace, copied character for character from the file, including indentation. Must appear exactly once in that file.",
    ),
  replace: z.string().describe("What that snippet becomes."),
});

const ProposalSchema = z.object({
  can_do: z
    .boolean()
    .describe("False if the request can't be done safely with these files."),
  summary: z
    .string()
    .describe(
      "One or two sentences a non-programmer can read, saying what will change and why. No jargon, no file paths.",
    ),
  edits: z.array(EditSchema),
  caveat: z
    .string()
    .describe(
      "A short plain-English warning if there's something the person should know before accepting, otherwise an empty string.",
    ),
});

export type ProposedFile = {
  path: string;
  hunks: DiffHunk[];
  added: number;
  removed: number;
  /** Full new contents, kept server-side for the pull request step. */
  content: string;
};

export type Proposal = {
  summary: string;
  caveat: string;
  files: ProposedFile[];
  added: number;
  removed: number;
};

export type StoredProposal = {
  owner: string;
  repo: string;
  branch: string;
  instruction: string;
  nodeTitle: string;
  proposal: Proposal;
};

/**
 * New file contents never go to the browser — the pull-request step looks them
 * up here by id instead. That keeps the payload small and means a tampered
 * response can't decide what gets committed.
 */
const held = new Map<string, { at: number; value: StoredProposal }>();
const HOLD_MS = 30 * 60 * 1000;

export function holdProposal(value: StoredProposal): string {
  const now = Date.now();
  for (const [key, entry] of held) {
    if (now - entry.at > HOLD_MS) held.delete(key);
  }
  const id = crypto.randomUUID();
  held.set(id, { at: now, value });
  return id;
}

export function takeProposal(id: string): StoredProposal | null {
  const entry = held.get(id);
  if (!entry || Date.now() - entry.at > HOLD_MS) {
    held.delete(id);
    return null;
  }
  return entry.value;
}

const SYSTEM = `You edit real production codebases on behalf of founders who cannot read code. They describe what they want in ordinary words; you make the smallest correct change.

Rules:
- Only edit the files you are given. Never invent a path.
- Make the minimum change that does the job. Do not reformat, reorder imports, rename things, or "tidy" code you were not asked about.
- Match the file's existing style, indentation and conventions exactly.
- Each "find" string must be copied character for character from the file and must appear EXACTLY ONCE in it. If a snippet would be ambiguous, include more surrounding lines until it is unique.
- If the change needs a new dependency, also edit the manifest (requirements.txt, package.json) when it was given to you.
- If you cannot do this safely with the files provided, set can_do to false and explain why in summary. Never guess.

The summary is read by someone non-technical. Say what will be different about their app in plain words. Do not mention file names, function names, or programming terms in it.`;

const MAX_FILE_CHARS = 60_000;
const MAX_TOTAL_CHARS = 140_000;

export async function proposeChange({
  owner,
  repo,
  branch,
  node,
  instruction,
}: {
  owner: string;
  repo: string;
  branch: string;
  node: GraphNode;
  instruction: string;
}): Promise<Proposal> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ChangeError(
      "Codarc isn't set up to write changes yet",
      "The server is missing its ANTHROPIC_API_KEY. Add it to .env.local and restart.",
      503,
    );
  }

  // The node's own file first, then what it reaches into — a change often
  // needs the thing it calls, and manifests for new dependencies.
  const wanted = [node.file, ...node.related].slice(0, 5);
  const files = await fetchFiles(owner, repo, branch, wanted);

  const primary = files.get(node.file);
  if (!primary) {
    throw new ChangeError(
      "We couldn't read that file",
      "GitHub wouldn't hand back the file behind this box. It may have moved since the map was drawn — reload and try again.",
      502,
    );
  }

  let budget = MAX_TOTAL_CHARS;
  const parts: string[] = [];
  for (const [path, body] of files) {
    const text = body.slice(0, MAX_FILE_CHARS);
    if (text.length > budget) continue;
    budget -= text.length;
    parts.push(`<file path="${path}">\n${text}\n</file>`);
  }

  const client = new Anthropic();

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      system: SYSTEM,
      output_config: {
        format: zodOutputFormat(ProposalSchema),
        effort: "high",
      },
      messages: [
        {
          role: "user",
          content: `The person is looking at this part of their app:

Name: ${node.title}
Technical name: ${node.code}
What it does: ${node.summary}
Lives in: ${node.file}

They asked for this change, in their own words:
"${instruction}"

Here are the files:

${parts.join("\n\n")}`,
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new ChangeError(
        "Codarc's writing key was rejected",
        "The ANTHROPIC_API_KEY on the server isn't valid. Check it and restart.",
        503,
      );
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new ChangeError(
        "Too many changes at once",
        "We're being rate limited. Wait a moment and try again.",
        429,
      );
    }
    throw new ChangeError(
      "We couldn't draft that change",
      "Something went wrong reaching the model. Try again in a moment.",
      502,
    );
  }

  if (response.stop_reason === "refusal") {
    throw new ChangeError(
      "We can't make that particular change",
      "That request was declined. Try describing what you want differently.",
      422,
    );
  }

  const proposal = response.parsed_output;
  if (!proposal) {
    throw new ChangeError(
      "We couldn't draft that change",
      "The answer came back in a shape we couldn't read. Try describing the change differently.",
      502,
    );
  }

  if (!proposal.can_do || proposal.edits.length === 0) {
    throw new ChangeError(
      "This one needs a person",
      proposal.summary ||
        "Codarc couldn't make this change safely from the files behind this box.",
      422,
    );
  }

  // Apply every edit before showing anything. An edit that doesn't match
  // exactly is a silent corruption risk, so we refuse the whole proposal.
  const updated = new Map<string, string>();
  for (const edit of proposal.edits) {
    const current = updated.get(edit.path) ?? files.get(edit.path);
    if (current === undefined) {
      throw new ChangeError(
        "That change reached a file we didn't open",
        `It tried to edit ${edit.path}, which isn't part of this box. Try a narrower request.`,
        422,
      );
    }
    const hits = current.split(edit.find).length - 1;
    if (hits !== 1) {
      throw new ChangeError(
        "We couldn't apply that cleanly",
        hits === 0
          ? "The code we were told to change doesn't match what's in the file any more. Reload the map and try again."
          : "The change was ambiguous — it matched in more than one place. Try describing it more specifically.",
        422,
      );
    }
    updated.set(edit.path, current.replace(edit.find, edit.replace));
  }

  const out: ProposedFile[] = [];
  let added = 0;
  let removed = 0;

  for (const [path, content] of updated) {
    const hunks = lineDiff(files.get(path) ?? "", content);
    const counts = countChanges(hunks);
    added += counts.added;
    removed += counts.removed;
    out.push({ path, hunks, content, ...counts });
  }

  return {
    summary: proposal.summary,
    caveat: proposal.caveat,
    files: out,
    added,
    removed,
  };
}
