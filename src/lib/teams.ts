import "server-only";
import crypto from "node:crypto";
import { db, isDbConfigured } from "@/lib/db";
import { MAX_SEATS } from "@/lib/plans";
import { upsertAccount, type Entitlement } from "@/lib/accounts";
import type { User } from "@/lib/session";

/**
 * Studio teams: up to five people, owner included, all on the owner's plan.
 * Past five the conversation moves to email — a bigger team is a sales call,
 * not a checkbox.
 */

export type Member = {
  githubId: number;
  login: string;
  name: string | null;
  avatar: string | null;
  role: "owner" | "member";
  joinedAt: string;
};

export type Team = {
  id: string;
  ownerId: number;
  members: Member[];
  seatsUsed: number;
  seatsTotal: number;
};

export type TeamResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { value: T }))
  | { ok: false; error: string; hint: string; status: number };

const fail = (error: string, hint: string, status = 400) =>
  ({ ok: false, error, hint, status }) as const;

async function membersOf(teamId: string): Promise<Member[]> {
  const { data } = await db()
    .from("team_members")
    .select("role, joined_at, accounts!inner(github_id, login, name, avatar)")
    .eq("team_id", teamId)
    .order("joined_at", { ascending: true });

  type Row = {
    role: "owner" | "member";
    joined_at: string;
    accounts: { github_id: number; login: string; name: string | null; avatar: string | null };
  };

  return ((data as Row[] | null) ?? []).map((r) => ({
    githubId: r.accounts.github_id,
    login: r.accounts.login,
    name: r.accounts.name,
    avatar: r.accounts.avatar,
    role: r.role,
    joinedAt: r.joined_at,
  }));
}

/** The team this person belongs to, whether they own it or joined it. */
export async function teamFor(userId: number): Promise<Team | null> {
  if (!isDbConfigured()) return null;

  const { data } = await db()
    .from("team_members")
    .select("team_id, teams!inner(owner_id)")
    .eq("account_id", userId)
    .maybeSingle();

  const row = data as { team_id: string; teams: { owner_id: number } } | null;
  if (!row) return null;

  const members = await membersOf(row.team_id);
  return {
    id: row.team_id,
    ownerId: row.teams.owner_id,
    members,
    seatsUsed: members.length,
    seatsTotal: MAX_SEATS,
  };
}

/** A Studio owner's team, made on first use. */
export async function ensureTeam(user: User, ent: Entitlement): Promise<TeamResult<Team>> {
  if (!isDbConfigured()) {
    return fail("Teams aren't switched on yet", "The database isn't connected.", 503);
  }
  if (ent.plan !== "studio" || ent.via === "team") {
    return fail(
      "Teams come with Studio",
      "Only the person paying for Studio can build the team.",
      402,
    );
  }

  const existing = await teamFor(user.id);
  if (existing) {
    if (existing.ownerId !== user.id) {
      return fail("You're already on someone's team", "Leave it first to start your own.", 409);
    }
    return { ok: true, value: existing };
  }

  await upsertAccount(user);

  const { data: team, error } = await db()
    .from("teams")
    .insert({ owner_id: user.id })
    .select("id")
    .single();
  if (error || !team) {
    return fail("We couldn't set up your team", "Try again in a moment.", 500);
  }

  await db()
    .from("team_members")
    .insert({ team_id: (team as { id: string }).id, account_id: user.id, role: "owner" });

  const made = await teamFor(user.id);
  return made
    ? { ok: true, value: made }
    : fail("We couldn't set up your team", "Try again in a moment.", 500);
}

export async function createInvite(user: User, ent: Entitlement): Promise<TeamResult<string>> {
  const team = await ensureTeam(user, ent);
  if (!team.ok) return team;

  if (team.value.seatsUsed >= MAX_SEATS) {
    return fail(
      `Your team is full — all ${MAX_SEATS} seats are taken`,
      "Remove someone to make room, or message us about a bigger team.",
      409,
    );
  }

  const token = crypto.randomBytes(24).toString("base64url");
  const { error } = await db()
    .from("team_invites")
    .insert({ token, team_id: team.value.id, created_by: user.id });
  if (error) return fail("We couldn't make an invite", "Try again in a moment.", 500);

  return { ok: true, value: token };
}

export type InvitePreview = {
  ownerName: string;
  ownerAvatar: string | null;
  seatsUsed: number;
  seatsTotal: number;
};

/** What the join page shows before someone accepts. */
export async function previewInvite(
  token: string,
): Promise<TeamResult<InvitePreview>> {
  if (!isDbConfigured()) {
    return fail("Teams aren't switched on yet", "The database isn't connected.", 503);
  }

  const { data } = await db()
    .from("team_invites")
    .select("team_id, expires_at, used_at, teams!inner(owner_id)")
    .eq("token", token)
    .maybeSingle();

  const invite = data as {
    team_id: string;
    expires_at: string;
    used_at: string | null;
    teams: { owner_id: number };
  } | null;

  if (!invite) return fail("This invite doesn't exist", "Ask for a fresh link.", 404);
  if (invite.used_at) return fail("This invite has already been used", "Each link works once. Ask for a new one.", 410);
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return fail("This invite has expired", "Invites last seven days. Ask for a new one.", 410);
  }

  const members = await membersOf(invite.team_id);
  const owner = members.find((m) => m.role === "owner");

  return {
    ok: true,
    value: {
      ownerName: owner?.name || owner?.login || "Someone",
      ownerAvatar: owner?.avatar ?? null,
      seatsUsed: members.length,
      seatsTotal: MAX_SEATS,
    },
  };
}

export async function acceptInvite(token: string, user: User): Promise<TeamResult> {
  const preview = await previewInvite(token);
  if (!preview.ok) return preview;

  const current = await teamFor(user.id);
  if (current) {
    return fail(
      "You're already on a team",
      "Someone can only be on one team at a time. Leave your current one first.",
      409,
    );
  }

  if (preview.value.seatsUsed >= MAX_SEATS) {
    return fail(
      "This team is full",
      `It already has all ${MAX_SEATS} people. Ask the owner to make room.`,
      409,
    );
  }

  await upsertAccount(user);

  const { data: invite } = await db()
    .from("team_invites")
    .select("team_id")
    .eq("token", token)
    .single();
  const teamId = (invite as { team_id: string }).team_id;

  const { error } = await db()
    .from("team_members")
    .insert({ team_id: teamId, account_id: user.id, role: "member" });

  if (error) {
    // The database trigger is the last word on seats.
    if (error.message.includes("team_full")) {
      return fail("This team just filled up", "Someone took the last seat. Ask the owner to make room.", 409);
    }
    return fail("We couldn't add you", "Try again in a moment.", 500);
  }

  await db()
    .from("team_invites")
    .update({ used_by: user.id, used_at: new Date().toISOString() })
    .eq("token", token);

  return { ok: true };
}

export async function removeMember(owner: User, memberId: number): Promise<TeamResult> {
  const team = await teamFor(owner.id);
  if (!team || team.ownerId !== owner.id) {
    return fail("Only the team owner can remove people", "", 403);
  }
  if (memberId === owner.id) {
    return fail("You can't remove yourself", "You own the team.", 400);
  }
  await db()
    .from("team_members")
    .delete()
    .eq("team_id", team.id)
    .eq("account_id", memberId);
  return { ok: true };
}

export async function leaveTeam(user: User): Promise<TeamResult> {
  const team = await teamFor(user.id);
  if (!team) return fail("You're not on a team", "", 400);
  if (team.ownerId === user.id) {
    return fail("You own this team", "Owners can't leave their own team.", 400);
  }
  await db()
    .from("team_members")
    .delete()
    .eq("team_id", team.id)
    .eq("account_id", user.id);
  return { ok: true };
}
