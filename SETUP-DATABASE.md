# Connecting the database

Supabase remembers who's paying, counts projects and changes, and holds
teams. About five minutes. Do it once.

**Don't paste any of these keys into a chat.** Put them straight into Vercel.

---

## 1. Create the tables

1. Open your project on **supabase.com**
2. Left sidebar → **SQL Editor** → **New query**
3. Open `supabase/schema.sql` from this project, copy all of it, paste it in
4. Click **Run**

You should see "Success. No rows returned." Running it twice is harmless.

## 2. Get three values

Left sidebar → **Project Settings** → **API**

| Copy this | Into this |
|---|---|
| **Project URL** | `SUPABASE_URL` |
| **service_role** key (click Reveal) | `SUPABASE_SERVICE_ROLE_KEY` |
| **anon** / public key | `SUPABASE_ANON_KEY` — only needed for live cursors |

> ⚠️ Use **service_role**, not **anon**. And never put it anywhere a browser
> can see it — no `NEXT_PUBLIC_` in front of the name.

## 3. Add them to Vercel

Project → **Settings** → **Environment Variables** → add both → **Redeploy**.

## 4. Check it worked

Sign in on your site, then open **supabase.com → Table Editor → accounts**.
Your GitHub name should be there.

---

## What's safe about this

Every table has Row Level Security switched on with no rules, so the public
key can read nothing at all. Only the server, holding the service_role key,
can reach the data. A trigger also stops any team going past five people,
even if two invites are accepted at the same instant.

## Giving someone a plan by hand

Until payments are connected, you can give yourself or a tester a plan in
**Table Editor → accounts**: set `plan` to `solo` or `studio` and
`plan_status` to `active`.
