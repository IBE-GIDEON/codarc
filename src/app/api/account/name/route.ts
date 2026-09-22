import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import { cleanName, setDisplayName } from "@/lib/accounts";

export const runtime = "nodejs";

/** Sets the name teammates see — a real name instead of a GitHub username. */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first", hint: "" }, { status: 401 });
  }

  let raw: unknown;
  try {
    ({ name: raw } = await request.json());
  } catch {}

  const name = cleanName(raw);
  if (!name) {
    return NextResponse.json(
      { error: "That name doesn't work", hint: "Use between 1 and 60 characters." },
      { status: 400 },
    );
  }

  const failure = await setDisplayName(user, name);
  if (failure) {
    return NextResponse.json(
      {
        error: "We couldn't save your name",
        hint: failure.message.includes("display_name")
          ? "The database needs one new line first. If you run Codarc: run the latest supabase/schema.sql."
          : "Try again in a moment.",
      },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, name });
}
