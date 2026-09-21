import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { atLeast, entitlement } from "@/lib/accounts";
import { claimProject } from "@/lib/usage";
import { parseRepoInput } from "@/lib/github";
import { canShare, encodeShare, type Offsets } from "@/lib/share";

export const runtime = "nodejs";

/** Makes a read-only link to a map. Studio feature: creating is paid, viewing is free. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to share", hint: "The link says who shared it, so we need to know who you are." },
      { status: 401 },
    );
  }

  const ent = await entitlement(user);
  if (!atLeast(ent.plan, "studio")) {
    return NextResponse.json(
      {
        error: "Sharing is part of Studio",
        hint: "Anyone can open a link you send. Making one is what the plan pays for.",
        needsPlan: true,
      },
      { status: 402 },
    );
  }

  if (!canShare()) {
    return NextResponse.json(
      { error: "Sharing isn't switched on yet", hint: "The server is missing SESSION_SECRET." },
      { status: 503 },
    );
  }

  let body: { repo?: string; note?: string; focus?: string; offsets?: Offsets };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That request didn't make sense", hint: "Try again." }, { status: 400 });
  }

  if (!body.repo) {
    return NextResponse.json({ error: "Which map?", hint: "Nothing to share." }, { status: 400 });
  }

  const { owner, repo } = parseRepoInput(body.repo);

  const project = await claimProject(ent, `${owner}/${repo}`);
  if (!project.ok) {
    return NextResponse.json({ error: project.error, hint: project.hint }, { status: 402 });
  }
  const note = body.note?.trim() || null;

  const token = encodeShare({
    owner,
    repo,
    sharedBy: { name: user.name || user.login, login: user.login, avatar: user.avatar },
    sharedAt: Date.now(),
    note,
    focus: body.focus || null,
    offsets: body.offsets ?? {},
  });

  const url = new URL(`/s/${token}`, request.url).toString();
  return NextResponse.json({ url });
}
