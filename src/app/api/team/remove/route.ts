import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { removeMember } from "@/lib/teams";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first", hint: "" }, { status: 401 });
  }
  let memberId: number | undefined;
  try {
    ({ memberId } = await request.json());
  } catch {}
  if (!memberId) {
    return NextResponse.json({ error: "Who should be removed?", hint: "" }, { status: 400 });
  }
  const result = await removeMember(user, memberId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, hint: result.hint }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
