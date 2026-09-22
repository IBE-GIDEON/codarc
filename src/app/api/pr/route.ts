import { NextResponse } from "next/server";
import { loadDraft, markSent } from "@/lib/drafts";
import { GithubAppError, isConfigured, openPullRequest } from "@/lib/github-app";
import { repoAccess, writeToken } from "@/lib/access";
import { currentUser } from "@/lib/session";
import { entitlement } from "@/lib/accounts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      {
        error: "Sign in to send changes",
        hint: "Codarc needs to know who you are before it opens a pull request.",
      },
      { status: 401 },
    );
  }

  const ent = await entitlement(user);
  if (ent.plan === "none") {
    return NextResponse.json(
      {
        error: "You need a plan to send changes",
        hint: "Looking at your map is free. Changing code is what the plan pays for.",
        needsPlan: true,
      },
      { status: 402 },
    );
  }
  // Checked again here, not just at drafting: the owner may have switched
  // them to view only in between.
  if (!ent.canEdit) {
    return NextResponse.json(
      {
        error: "You can look, but not change things",
        hint: "Your team's owner has set you to view only, so this change wasn't sent.",
        viewOnly: true,
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

  const held = await loadDraft(proposalId, user.id);
  if (!held) {
    return NextResponse.json(
      {
        error: "That draft has expired",
        hint: "Drafts are kept for a day. Ask for the change again and send it.",
      },
      { status: 410 },
    );
  }

  // A second click, or a retry after a slow network, shouldn't open a second
  // pull request for the same change.
  if (held.sent) {
    return NextResponse.json({ ...held.sent, branch: null });
  }

  try {
    // Only where GitHub itself says this person may change things (or their
    // Studio owner may) — the app's key could open far more than that.
    const access = await repoAccess(user, held.owner, held.repo);
    if (!access) {
      return NextResponse.json(
        {
          error: "Codarc can't send changes to this project",
          hint: "It only sends changes to projects you've connected. Connect GitHub and tick this one, then try again.",
        },
        { status: 403 },
      );
    }
    if (!access.canWrite) {
      return NextResponse.json(
        {
          error: "GitHub only lets you look at this project",
          hint: "You can read it, but not change it. Ask whoever runs it on GitHub to give you write access, then send it again.",
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
      // Wherever Codarc is actually running — never a domain nobody owns.
      `Drafted by [Codarc](${new URL(request.url).origin}). Review it like any other pull request.`,
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

    await markSent(proposalId, { url: pr.url, number: pr.number });
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
