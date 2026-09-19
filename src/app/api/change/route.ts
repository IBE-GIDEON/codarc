import { NextResponse } from "next/server";
import { ChangeError, holdProposal, proposeChange } from "@/lib/change";
import { RepoError, parseRepoInput } from "@/lib/github";
import type { GraphNode } from "@/lib/graph";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  let body: {
    repo?: string;
    branch?: string;
    node?: GraphNode;
    instruction?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "That request didn't make sense", hint: "Try again." },
      { status: 400 },
    );
  }

  const { repo, branch, node, instruction } = body;

  if (!repo || !node?.file || !instruction?.trim()) {
    return NextResponse.json(
      {
        error: "Something was missing",
        hint: "We need the repository, the part you're changing, and what you want different.",
      },
      { status: 400 },
    );
  }

  if (instruction.length > 2000) {
    return NextResponse.json(
      {
        error: "That's a lot to ask at once",
        hint: "Keep it to a couple of sentences. Big rewrites are better split into smaller changes.",
      },
      { status: 400 },
    );
  }

  try {
    const { owner, repo: name } = parseRepoInput(repo);
    const proposal = await proposeChange({
      owner,
      repo: name,
      branch: branch || "HEAD",
      node,
      instruction: instruction.trim(),
    });

    const proposalId = holdProposal({
      owner,
      repo: name,
      branch: branch || "HEAD",
      instruction: instruction.trim(),
      nodeTitle: node.title,
      proposal,
    });

    // The full file contents stay on the server; the browser only needs the
    // diff to render. Sending whole files back would bloat the response and
    // invite a tampered payload on the pull-request step.
    return NextResponse.json({
      proposalId,
      summary: proposal.summary,
      caveat: proposal.caveat,
      added: proposal.added,
      removed: proposal.removed,
      files: proposal.files.map((f) => ({
        path: f.path,
        hunks: f.hunks,
        added: f.added,
        removed: f.removed,
      })),
    });
  } catch (err) {
    if (err instanceof ChangeError || err instanceof RepoError) {
      return NextResponse.json(
        { error: err.message, hint: err.hint },
        { status: err.status },
      );
    }
    console.error("[change]", err);
    return NextResponse.json(
      {
        error: "Something broke while drafting that change",
        hint: "This one's on us. Try again in a moment.",
      },
      { status: 500 },
    );
  }
}
