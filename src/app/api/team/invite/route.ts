import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { entitlement } from "@/lib/accounts";
import { createInvite } from "@/lib/teams";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first", hint: "" }, { status: 401 });
  }
  const result = await createInvite(user, await entitlement(user));
  if (!result.ok) {
    return NextResponse.json({ error: result.error, hint: result.hint }, { status: result.status });
  }
  const url = new URL(`/join/${result.value}`, request.url).toString();
  return NextResponse.json({ url });
}
