import "server-only";
import crypto from "node:crypto";
import { db, isDbConfigured } from "@/lib/db";
import type { StoredProposal } from "@/lib/change";

/**
 * A drafted change, waiting to be sent to GitHub.
 *
 * New file contents never go to the browser — the pull-request step looks
 * them up here by id instead. That keeps the payload small and means a
 * tampered response can't decide what gets committed.
 *
 * They live in the database because on Vercel the request that drafts and
 * the request that sends often land on different servers; a draft kept in
 * one server's memory would look "expired" to the other. Memory is only the
 * fallback for when the database isn't there.
 */

export type Draft = StoredProposal & {
  accountId: number;
  /** Set once it's been sent, so a second click reopens the same pull request. */
  sent: { url: string; number: number } | null;
};

const KEEP_HOURS = 24;
const memory = new Map<string, { at: number; value: Draft }>();
const MEMORY_MS = 30 * 60 * 1000;

type Row = {
  id: string;
  account_id: number;
  owner: string;
  repo: string;
  branch: string;
  instruction: string;
  node_title: string;
  proposal: StoredProposal["proposal"];
  pr_url: string | null;
  pr_number: number | null;
};

const fromRow = (r: Row): Draft => ({
  accountId: r.account_id,
  owner: r.owner,
  repo: r.repo,
  branch: r.branch,
  instruction: r.instruction,
  nodeTitle: r.node_title,
  proposal: r.proposal,
  sent: r.pr_url && r.pr_number ? { url: r.pr_url, number: r.pr_number } : null,
});

function remember(id: string, value: Draft) {
  const now = Date.now();
  for (const [key, entry] of memory) {
    if (now - entry.at > MEMORY_MS) memory.delete(key);
  }
  memory.set(id, { at: now, value });
}

export async function saveDraft(accountId: number, value: StoredProposal): Promise<string> {
  const id = crypto.randomUUID();
  const draft: Draft = { ...value, accountId, sent: null };

  if (isDbConfigured()) {
    const { error } = await db()
      .from("drafts")
      .insert({
        id,
        account_id: accountId,
        owner: value.owner,
        repo: value.repo,
        branch: value.branch,
        instruction: value.instruction,
        node_title: value.nodeTitle,
        proposal: value.proposal,
        expires_at: new Date(Date.now() + KEEP_HOURS * 3600_000).toISOString(),
      });
    if (!error) {
      // Tidy as we go — nothing else ever reads an old draft.
      await db().from("drafts").delete().lt("expires_at", new Date().toISOString());
      return id;
    }
    // Most likely the drafts table hasn't been created yet. Keep working.
    console.error("[drafts] save", error.code ?? "", error.message);
  }

  remember(id, draft);
  return id;
}

/** Only the person who drafted it can send it. */
export async function loadDraft(id: string, accountId: number): Promise<Draft | null> {
  if (isDbConfigured()) {
    const { data } = await db()
      .from("drafts")
      .select("id, account_id, owner, repo, branch, instruction, node_title, proposal, pr_url, pr_number")
      .eq("id", id)
      .eq("account_id", accountId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (data) return fromRow(data as Row);
  }

  const entry = memory.get(id);
  if (!entry || Date.now() - entry.at > MEMORY_MS || entry.value.accountId !== accountId) {
    return null;
  }
  return entry.value;
}

export async function markSent(id: string, pr: { url: string; number: number }) {
  if (isDbConfigured()) {
    const { error } = await db()
      .from("drafts")
      .update({ pr_url: pr.url, pr_number: pr.number })
      .eq("id", id);
    if (error) console.error("[drafts] markSent", error.code ?? "", error.message);
  }
  const entry = memory.get(id);
  if (entry) entry.value.sent = pr;
}
