import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { atLeast, entitlement } from "@/lib/accounts";
import { canPresence, presenceChannel } from "@/lib/presence";
import { env, supabaseUrl } from "@/lib/env";

export const runtime = "nodejs";

/**
 * Hands a Studio user what they need to join their team's live room for this
 * map. Anyone else gets `enabled: false` and no channel name — without the
 * name there's nothing to join.
 */
export async function GET(request: Request) {
  const repo = new URL(request.url).searchParams.get("repo");
  const user = await currentUser();

  if (!repo || !user || !canPresence()) {
    return NextResponse.json({ enabled: false });
  }

  const ent = await entitlement(user);
  if (!atLeast(ent.plan, "studio") || !ent.billingId) {
    return NextResponse.json({ enabled: false });
  }

  return NextResponse.json({
    enabled: true,
    url: supabaseUrl(),
    // The anon key is designed to be public; every table has RLS with no
    // policies, so it can't read any data. It only opens the realtime socket.
    anonKey: env("SUPABASE_ANON_KEY"),
    channel: presenceChannel(ent.billingId, repo),
    me: {
      id: user.id,
      login: user.login,
      name: user.name || user.login,
      avatar: user.avatar,
    },
  });
}
