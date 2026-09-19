import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isConfigured } from "@/lib/github-app";
import { isOwner } from "@/lib/owner";
import { canSignIn, currentUser } from "@/lib/session";

export const runtime = "nodejs";

/**
 * What this visitor can do right now. The map needs nothing at all, so the UI
 * asks rather than assuming — better to say "sign in to change things" than
 * to let someone type a request that was always going to be refused.
 */
export async function GET() {
  const installation = (await cookies()).get("codarc-installation")?.value;
  const user = await currentUser();

  return NextResponse.json({
    user: user && {
      login: user.login,
      name: user.name,
      avatar: user.avatar,
    },
    canSignIn: canSignIn(),
    // Three separate gates, in the order someone meets them.
    signedIn: Boolean(user),
    canDraft:
      Boolean(process.env.ANTHROPIC_API_KEY) &&
      Boolean(user) &&
      (await isOwner()),
    canSend: isConfigured(),
    connected: Boolean(installation),
  });
}
