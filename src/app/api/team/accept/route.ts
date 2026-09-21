import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { acceptInvite } from "@/lib/teams";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first", hint: "" }, { status: 401 });
  }
  let token: string | undefined;
  try {
    ({ token } = await request.json());
  } catch {}
  if (!token) {
    return NextResponse.json({ error: "No invite given", hint: "" }, { status: 400 });
  }
  const result = await acceptInvite(token, user);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, hint: result.hint }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
