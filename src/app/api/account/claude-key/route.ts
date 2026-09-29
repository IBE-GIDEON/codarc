import { NextResponse } from "next/server";
import { currentUser } from "@/lib/session";
import {
  checkWithAnthropic,
  looksLikeKey,
  removeClaudeKey,
  saveClaudeKey,
} from "@/lib/claude-key";

export const runtime = "nodejs";

/**
 * Saving someone's own Claude key. It's checked with Anthropic before it's
 * stored, kept encrypted, and never sent back — the account page only ever
 * shows a hint like "sk-ant-…4f2a".
 */
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first", hint: "" }, { status: 401 });
  }

  let raw: unknown;
  try {
    ({ key: raw } = await request.json());
  } catch {}

  if (!looksLikeKey(raw)) {
    return NextResponse.json(
      {
        error: "That doesn't look like a Claude key",
        hint: "Keys start with sk-ant- and come from console.anthropic.com → API keys.",
      },
      { status: 400 },
    );
  }

  const check = await checkWithAnthropic(raw.trim());
  if (!check.ok) {
    return NextResponse.json({ error: check.error, hint: check.help }, { status: 400 });
  }

  const failure = await saveClaudeKey(user, raw.trim());
  if (failure) {
    return NextResponse.json(
      {
        error: "We couldn't save your key",
        hint: failure.message.includes("claude_key")
          ? "The database needs two new lines first. If you run Codarc: run the latest supabase/schema.sql."
          : "Try again in a moment.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, hint: check.hint });
}

export async function DELETE() {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first", hint: "" }, { status: 401 });
  }
  const failure = await removeClaudeKey(user);
  if (failure) {
    return NextResponse.json(
      { error: "We couldn't remove it", hint: "Try again in a moment." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
