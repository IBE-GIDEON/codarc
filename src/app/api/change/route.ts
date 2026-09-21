import { NextResponse } from "next/server";
import { ChangeError, holdProposal, proposeChange } from "@/lib/change";
import { RepoError, parseRepoInput } from "@/lib/github";
import type { GraphNode } from "@/lib/graph";
import { currentUser } from "@/lib/session";
import { entitlement } from "@/lib/accounts";
import { checkChangeAllowance, claimProject, recordChange } from "@/lib/usage";
import { readToken, repoAccess } from "@/lib/access";
import { GithubAppError } from "@/lib/github-app";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  // Both gates run before the body is even read: a draft spends real money,
  // and we want a name attached to every one of them.
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      {
        error: "Sign in to change things",
        hint: "Codarc needs to know who you are before it edits your code.",
      },
      { status: 401 },
    );
  }

  const ent = await entitlement(user);
  if (ent.plan === "none") {
    return NextResponse.json(
      {
        error: "You need a plan to change things",
        hint: "Looking at your map is free. Changing code is what the plan pays for.",
        needsPlan: true,
      },
      { status: 402 },
    );
  }

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

    // Limits are checked before the model is called — that's the part that
    // costs money, so a refusal should cost nothing.
    const project = await claimProject(ent, `${owner}/${name}`);
    if (!project.ok) {
      return NextResponse.json({ error: project.error, hint: project.hint, overLimit: true }, { status: 402 });
    }
    const allowance = await checkChangeAllowance(ent);
    if (!allowance.ok) {
      return NextResponse.json({ error: allowance.error, hint: allowance.hint, overLimit: true }, { status: 402 });
    }

    // A connected repository is read with its own token, which is what makes
    // private ones work. Public ones without it still draft fine.
    const access = await repoAccess(user, owner, name);
    const proposal = await proposeChange({
      owner,
      repo: name,
      branch: branch || "HEAD",
      node,
      instruction: instruction.trim(),
      repoToken: access ? await readToken(access, name) : undefined,
    });

    await recordChange(ent, `${owner}/${name}`);

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
    if (err instanceof ChangeError || err instanceof RepoError || err instanceof GithubAppError) {
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
