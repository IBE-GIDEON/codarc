import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { takeProposal } from "@/lib/change";
import {
  GithubAppError,
  installationForRepo,
  installationToken,
  isConfigured,
  openPullRequest,
} from "@/lib/github-app";
import { isOwner } from "@/lib/owner";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await isOwner())) {
    return NextResponse.json(
      {
        error: "Sending changes isn't switched on yet",
        hint: "Reading and mapping works today.",
      },
      { status: 403 },
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
    // Prefer the installation that actually covers this repo — the cookie is
    // only a hint, and someone may have installed on a different account.
    const cookieId = (await cookies()).get("codarc-installation")?.value;
    const installationId =
      (await installationForRepo(held.owner, held.repo)) ?? cookieId;

    if (!installationId) {
      return NextResponse.json(
        {
          error: "Codarc isn't installed on this repository",
          hint: "Connect GitHub and pick this repository, then try again.",
        },
        { status: 403 },
      );
    }

    const token = await installationToken(installationId);

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
