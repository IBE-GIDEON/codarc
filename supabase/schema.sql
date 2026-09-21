-- Codarc — database schema
--
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to run again; everything is "if not exists".
--
-- Row Level Security is switched ON for every table with NO policies. That
-- means the public (anon) key can read nothing at all — only the server,
-- holding the service-role key, can touch this data. Codarc never talks to
-- the database from the browser.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- accounts
-- One row per person, keyed on GitHub's numeric id (stable across renames).
create table if not exists accounts (
  github_id           bigint primary key,
  login               text not null,
  name                text,
  avatar              text,
  plan                text not null default 'none'
                        check (plan in ('none', 'solo', 'studio')),
  plan_status         text not null default 'inactive'
                        check (plan_status in ('inactive', 'active', 'past_due', 'cancelled')),
  stripe_customer_id  text unique,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------- projects
-- A repository becomes one of your projects the first time you use a paid
-- feature on it. Solo allows 3.
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  account_id  bigint not null references accounts(github_id) on delete cascade,
  repo        text not null,  -- "owner/name", lowercased
  created_at  timestamptz not null default now(),
  unique (account_id, repo)
);

-- ---------------------------------------------------------------- changes
-- One row per drafted change, for the monthly allowance.
create table if not exists changes (
  id          uuid primary key default gen_random_uuid(),
  account_id  bigint not null references accounts(github_id) on delete cascade,
  repo        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists changes_by_account_and_time
  on changes (account_id, created_at desc);

-- ---------------------------------------------------------------- teams
-- A Studio account owns at most one team. Members use the owner's plan.
create table if not exists teams (
  id          uuid primary key default gen_random_uuid(),
  owner_id    bigint not null unique references accounts(github_id) on delete cascade,
  name        text,
  created_at  timestamptz not null default now()
);

create table if not exists team_members (
  team_id     uuid not null references teams(id) on delete cascade,
  account_id  bigint not null references accounts(github_id) on delete cascade,
  role        text not null default 'member' check (role in ('owner', 'member')),
  joined_at   timestamptz not null default now(),
  primary key (team_id, account_id)
);

-- Someone can belong to one team at a time.
create unique index if not exists one_team_per_person
  on team_members (account_id);

create table if not exists team_invites (
  token       text primary key,
  team_id     uuid not null references teams(id) on delete cascade,
  created_by  bigint not null references accounts(github_id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '7 days'),
  used_by     bigint references accounts(github_id) on delete set null,
  used_at     timestamptz
);

-- ------------------------------------------------------------ seat limit
-- The app checks seats before adding someone, but two people accepting an
-- invite at the same instant could both pass that check. This trigger is the
-- last word: a team can never hold more than five people.
create or replace function enforce_team_seats() returns trigger
language plpgsql as $$
begin
  if (select count(*) from team_members where team_id = new.team_id) >= 5 then
    raise exception 'team_full' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists team_seat_limit on team_members;
create trigger team_seat_limit
  before insert on team_members
  for each row execute function enforce_team_seats();

-- ------------------------------------------------------------------- RLS
alter table accounts      enable row level security;
alter table projects      enable row level security;
alter table changes       enable row level security;
alter table teams         enable row level security;
alter table team_members  enable row level security;
alter table team_invites  enable row level security;
