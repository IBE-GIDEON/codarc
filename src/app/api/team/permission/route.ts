import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { setMemberEdit } from "@/lib/teams";

export const runtime = "nodejs";

/** The team owner switches someone between "Can edit" and "View only". */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first", hint: "" }, { status: 401 });
  }
  let memberId: number | undefined;
  let canEdit: boolean | undefined;
  try {
    ({ memberId, canEdit } = await request.json());
  } catch {}
  if (!memberId || typeof canEdit !== "boolean") {
    return NextResponse.json({ error: "Who, and can they edit?", hint: "" }, { status: 400 });
  }
  const result = await setMemberEdit(user, memberId, canEdit);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, hint: result.hint }, { status: result.status });
  }
  return NextResponse.json({ ok: true });
}
