# Connecting payments (Lemon Squeezy)

Lemon Squeezy takes the card, charges the right sales tax in every country,
and pays out to your Nigerian bank. Codarc never sees a card. About 20
minutes. Setting up costs nothing — Lemon Squeezy takes a cut of each sale.

**Don't paste any of these keys into a chat.** Put them straight into Vercel.

Do everything in **Test mode** first (switch at the bottom-left of the Lemon
Squeezy dashboard). Test mode uses fake cards, so you can buy your own plan
and watch it switch on without spending anything.

---

## 1. Run the new database lines

Supabase → **SQL Editor** → **New query** → paste → **Run**:

```sql
alter table accounts add column if not exists billing_subscription_id text unique;
alter table accounts add column if not exists billing_customer_id     text;
alter table accounts add column if not exists plan_ends_at            timestamptz;
alter table accounts add column if not exists billing_synced_at       timestamptz;
```

## 2. Make the two plans

Lemon Squeezy → **Products** → **New product**, twice:

| Name | Pricing | Price |
|---|---|---|
| Codarc Solo | Subscription, every **1 month** | $29 |
| Codarc Studio | Subscription, every **1 month** | $79 |

Click **Publish** on both.

## 3. Make an API key

Lemon Squeezy → **Settings** → **API** → **+** → name it `codarc` → copy it.

Vercel → **Settings** → **Environment Variables** → add
`LEMONSQUEEZY_API_KEY` → paste → Save.

## 4. Make the webhook

This is how Lemon Squeezy tells Codarc "they paid".

1. Make up a long random password (a password manager's generator is fine).
2. Lemon Squeezy → **Settings** → **Webhooks** → **+**
   - **Callback URL:** `https://codarc-rho.vercel.app/api/webhooks/lemonsqueezy`
   - **Signing secret:** the password you made up
   - **Events:** tick every one that starts with `subscription_`
3. Vercel → add `LEMONSQUEEZY_WEBHOOK_SECRET` → the same password.

Redeploy (Vercel → **Deployments** → **⋯** → **Redeploy**).

## 5. Copy three IDs

Open `https://codarc-rho.vercel.app/api/billing/setup` (you need to have
unlocked with your owner key). It lists your store and plans with their IDs.

| From that page | Into Vercel as |
|---|---|
| the store `id` | `LEMONSQUEEZY_STORE_ID` |
| the $29 / month variant `id` | `LEMONSQUEEZY_SOLO_VARIANT_ID` |
| the $79 / month variant `id` | `LEMONSQUEEZY_STUDIO_VARIANT_ID` |

Redeploy again.

## 6. Check it

- `/api/health` should say `"payments": true` and `"billingColumns": true`.
- Choose a plan on `/choose`, pay with Lemon Squeezy's test card
  (`4242 4242 4242 4242`, any future date, any CVC).
- You land back on your dashboard. In Supabase → **Table Editor** →
  **accounts**, your row should now say `solo` / `active`.

(Your owner key always gives you Studio, so check the database row to see
the purchase landed.)

## 7. Going live

Lemon Squeezy has to approve your store before it takes real money — it asks
for ID and details about Codarc. Once approved:

1. Switch off Test mode.
2. Make a **live** API key and a **live** webhook (same URL, same events).
3. The products carry over, but their IDs change — open `/api/billing/setup`
   again and update the three IDs.
4. Update `LEMONSQUEEZY_API_KEY` and `LEMONSQUEEZY_WEBHOOK_SECRET` in Vercel,
   and redeploy.

---

## How it behaves

- **Paid** → the plan switches on within seconds.
- **Card fails** → everything keeps working for two weeks while Lemon Squeezy
  retries; the dashboard asks them to update their card.
- **Cancelled** → keeps working until the month they paid for runs out.
- **Switching plans** → on Lemon Squeezy's billing page (the "Billing" link),
  so nobody ends up paying twice.
