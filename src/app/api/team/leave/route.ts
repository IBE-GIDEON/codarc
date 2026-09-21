import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { leaveTeam } from "@/lib/teams";

export const runtime = "nodejs";

export async function POST() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first", hint: "" }, { status: 401 });
  }
  const result = await leaveTeam(user);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, hint: result.hint }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
