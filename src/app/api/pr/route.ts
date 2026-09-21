import { NextResponse } from "next/server";
import { takeProposal } from "@/lib/change";
import { GithubAppError, isConfigured, openPullRequest } from "@/lib/github-app";
import { repoAccess, writeToken } from "@/lib/access";
import { currentUser } from "@/lib/session";
import { hasActivePlan } from "@/lib/billing";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await currentUser())) {
    return NextResponse.json(
      {
        error: "Sign in to send changes",
        hint: "Codarc needs to know who you are before it opens a pull request.",
      },
      { status: 401 },
    );
  }

  if (!(await hasActivePlan(await currentUser()))) {
    return NextResponse.json(
      {
        error: "You need a plan to send changes",
        hint: "Looking at your map is free. Changing code is what the plan pays for.",
        needsPlan: true,
      },
      { status: 402 },
    );
  }

  if (!isConfigured()) {
    return NextResponse.json(
      {
        error: "Codarc isn't connected to GitHub yet",
        hint: "The server is missing its GitHub App keys. See SETUP-GITHUB.md.",
      },
      { status: 503 },
    );
  }

  let proposalId: string | undefined;
  try {
    ({ proposalId } = await request.json());
  } catch {
    // handled below
  }

  if (!proposalId) {
    return NextResponse.json(
      { error: "Nothing to send", hint: "Draft a change first." },
      { status: 400 },
    );
  }

  const held = takeProposal(proposalId);
  if (!held) {
    return NextResponse.json(
      {
        error: "That draft has expired",
        hint: "Drafts are kept for half an hour. Ask for the change again and send it straight away.",
      },
      { status: 410 },
    );
  }

  try {
    // Only on a repository this person (or their Studio owner) connected —
    // the app's key could open far more than that.
    const access = await repoAccess(await currentUser(), held.owner, held.repo);
    if (!access) {
      return NextResponse.json(
        {
          error: "Codarc can't send changes to this project",
          hint: "It only sends changes to projects you've connected. Connect GitHub and tick this one, then try again.",
        },
        { status: 403 },
      );
    }

    const token = await writeToken(access, held.repo);

    const title = `Codarc: ${held.nodeTitle.toLowerCase()}`;
    const body = [
      held.proposal.summary,
      "",
      "**What was asked for**",
      "",
      `> ${held.instruction}`,
      held.proposal.caveat ? `\n**Worth knowing**\n\n${held.proposal.caveat}` : "",
      "",
      "---",
      "",
      "Drafted by [Codarc](https://codarc.dev). Review it like any other pull request.",
    ].join("\n");

    const pr = await openPullRequest({
      token,
      owner: held.owner,
      repo: held.repo,
      base: held.branch,
      title,
      body,
      files: held.proposal.files.map((f) => ({
        path: f.path,
        content: f.content,
      })),
    });

    return NextResponse.json(pr);
  } catch (err) {
    if (err instanceof GithubAppError) {
      return NextResponse.json(
        { error: err.message, hint: err.hint },
        { status: err.status },
      );
    }
    console.error("[pr]", err);
    return NextResponse.json(
      {
        error: "We couldn't open the pull request",
        hint: "This one's on us. The change wasn't sent — try again in a moment.",
      },
      { status: 500 },
    );
  }
}
