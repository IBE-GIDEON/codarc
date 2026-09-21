import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { entitlement } from "@/lib/accounts";
import { replaceMember } from "@/lib/teams";

export const runtime = "nodejs";

/** Removes someone and returns a fresh invite link for their seat. */
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
    return NextResponse.json({ error: "Who should be replaced?", hint: "" }, { status: 400 });
  }
  const result = await replaceMember(user, await entitlement(user), memberId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, hint: result.hint }, { status: result.status });
  }
  const url = new URL(`/join/${result.value}`, request.url).toString();
  return NextResponse.json({ url });
}
