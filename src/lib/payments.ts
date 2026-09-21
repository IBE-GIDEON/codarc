import "server-only";
import crypto from "node:crypto";
import { env, hasEnv } from "@/lib/env";
import { db, isDbConfigured } from "@/lib/db";
import type { PlanId } from "@/lib/plans";

/**
 * Payments, through Lemon Squeezy.
 *
 * Lemon Squeezy is the "merchant of record": it takes the card, charges the
 * right sales tax in every country, and pays out to a Nigerian bank. Codarc
 * never sees a card number.
 *
 * Everything Lemon Squeezy-specific lives in this file. Lemon Squeezy is
 * folding into Stripe over time, so if Codarc ever moves, this is the one
 * file to rewrite — the rest of the app only knows "plan" and "status".
 */

const API = "https://api.lemonsqueezy.com/v1";

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly hint: string,
    readonly status = 502,
  ) {
    super(message);
  }
}

export function paymentsConfigured() {
  return (
    hasEnv("LEMONSQUEEZY_API_KEY") &&
    hasEnv("LEMONSQUEEZY_STORE_ID") &&
    hasEnv("LEMONSQUEEZY_WEBHOOK_SECRET") &&
    hasEnv("LEMONSQUEEZY_SOLO_VARIANT_ID") &&
    hasEnv("LEMONSQUEEZY_STUDIO_VARIANT_ID")
  );
}

const variantFor = (plan: PlanId) =>
  env(plan === "solo" ? "LEMONSQUEEZY_SOLO_VARIANT_ID" : "LEMONSQUEEZY_STUDIO_VARIANT_ID");

export function planForVariant(variantId: string | number): PlanId | null {
  const id = String(variantId);
  if (id === env("LEMONSQUEEZY_SOLO_VARIANT_ID")) return "solo";
  if (id === env("LEMONSQUEEZY_STUDIO_VARIANT_ID")) return "studio";
  return null;
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${env("LEMONSQUEEZY_API_KEY")}`,
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[payments]", path, res.status, detail.slice(0, 400));
    throw new PaymentError(
      "The payment page didn't open",
      res.status === 401
        ? "Codarc's payment key was turned down. If you run Codarc: check LEMONSQUEEZY_API_KEY in Vercel."
        : "Nothing has been charged. Try again in a moment.",
    );
  }
  return res.json() as Promise<T>;
}

/**
 * A checkout page for one plan, tagged with who's buying. The tag comes back
 * on every webhook, which is how a payment finds its way to the right account.
 */
export async function createCheckout({
  plan,
  user,
  redirectUrl,
}: {
  plan: PlanId;
  user: { id: number; name: string | null; login: string };
  redirectUrl: string;
}): Promise<string> {
  const variant = variantFor(plan);
  const res = await api<{ data: { attributes: { url: string } } }>("/checkouts", {
    method: "POST",
    body: JSON.stringify({
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            name: user.name ?? user.login,
            custom: { github_id: String(user.id) },
          },
          product_options: {
            enabled_variants: [Number(variant)],
            redirect_url: redirectUrl,
          },
          checkout_options: { embed: false },
        },
        relationships: {
          store: { data: { type: "stores", id: env("LEMONSQUEEZY_STORE_ID") } },
          variant: { data: { type: "variants", id: variant } },
        },
      },
    }),
  });
  return res.data.attributes.url;
}

/** A fresh link to Lemon Squeezy's billing page. Links only last a day, so ask each time. */
export async function portalUrl(subscriptionId: string): Promise<string> {
  const res = await api<{ data: { attributes: { urls: { customer_portal: string } } } }>(
    `/subscriptions/${encodeURIComponent(subscriptionId)}`,
  );
  return res.data.attributes.urls.customer_portal;
}

/** Lemon Squeezy signs each webhook with our secret; anything else is thrown away. */
export function verifyWebhook(raw: string, signature: string | null): boolean {
  const secret = env("LEMONSQUEEZY_WEBHOOK_SECRET");
  if (!secret || !signature) return false;
  const expected = Buffer.from(crypto.createHmac("sha256", secret).update(raw).digest("hex"));
  const given = Buffer.from(signature);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/**
 * Lemon Squeezy's statuses, in Codarc's words:
 * - paying, or in the two weeks of retries after a failed card → keep access
 * - cancelled → keep access until the paid-for month runs out
 * - anything else → access ends
 */
function toPlanStatus(status: string): "active" | "past_due" | "cancelled" | "inactive" {
  if (status === "active" || status === "on_trial") return "active";
  if (status === "past_due") return "past_due";
  if (status === "cancelled") return "cancelled";
  return "inactive"; // unpaid, expired, paused
}

const LIVE = new Set(["active", "past_due", "cancelled"]);

export type SubscriptionEvent = {
  event: string;
  subscriptionId: string;
  githubId: number | null;
  variantId: number;
  customerId: number | null;
  status: string;
  endsAt: string | null;
  updatedAt: string;
};

export function readSubscriptionEvent(body: unknown): SubscriptionEvent | null {
  const b = body as {
    meta?: { event_name?: string; custom_data?: { github_id?: string | number } };
    data?: {
      type?: string;
      id?: string;
      attributes?: {
        variant_id?: number;
        customer_id?: number;
        status?: string;
        ends_at?: string | null;
        updated_at?: string;
      };
    };
  };
  // Invoices and orders arrive too; the subscription events carry everything we need.
  if (b.data?.type !== "subscriptions" || !b.data.id || !b.data.attributes) return null;
  const a = b.data.attributes;
  const githubId = Number(b.meta?.custom_data?.github_id);
  return {
    event: b.meta?.event_name ?? "",
    subscriptionId: String(b.data.id),
    githubId: Number.isFinite(githubId) && githubId > 0 ? githubId : null,
    variantId: Number(a.variant_id),
    customerId: a.customer_id ?? null,
    status: a.status ?? "",
    endsAt: a.ends_at ?? null,
    updatedAt: a.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Writes a subscription's latest state onto the account it belongs to.
 * Returns false only when saving failed, so Lemon Squeezy tries again.
 */
export async function applySubscription(e: SubscriptionEvent): Promise<boolean> {
  if (!isDbConfigured()) return false;

  const plan = planForVariant(e.variantId);
  if (!plan) {
    console.error("[payments] unknown variant", e.variantId, "on", e.subscriptionId);
    return true; // not ours to handle; retrying won't change that
  }

  // Find the account: the tag from checkout, or the subscription we saved before.
  let githubId = e.githubId;
  if (!githubId) {
    const { data } = await db()
      .from("accounts")
      .select("github_id")
      .eq("billing_subscription_id", e.subscriptionId)
      .maybeSingle();
    githubId = (data as { github_id: number } | null)?.github_id ?? null;
  }
  if (!githubId) {
    console.error("[payments] no account for subscription", e.subscriptionId);
    return true;
  }

  const { data: current, error: readError } = await db()
    .from("accounts")
    .select("*")
    .eq("github_id", githubId)
    .maybeSingle();
  if (readError) {
    console.error("[payments] read", readError.code, readError.message);
    return false;
  }
  if (!current) {
    console.error("[payments] account missing", githubId);
    return true;
  }

  const row = current as {
    billing_subscription_id?: string | null;
    billing_synced_at?: string | null;
  };
  const planStatus = toPlanStatus(e.status);

  // Someone who bought twice: an old subscription winding down mustn't
  // switch off the one they're paying for now.
  const other = row.billing_subscription_id && row.billing_subscription_id !== e.subscriptionId;
  if (other && !LIVE.has(planStatus)) return true;

  // Webhooks can arrive out of order. Never let an older one undo a newer one.
  if (
    !other &&
    row.billing_synced_at &&
    Date.parse(row.billing_synced_at) > Date.parse(e.updatedAt)
  ) {
    return true;
  }

  const { error } = await db()
    .from("accounts")
    .update({
      plan,
      plan_status: planStatus,
      plan_ends_at: e.endsAt,
      billing_subscription_id: e.subscriptionId,
      billing_customer_id: e.customerId === null ? null : String(e.customerId),
      billing_synced_at: e.updatedAt,
      updated_at: new Date().toISOString(),
    })
    .eq("github_id", githubId);

  if (error) {
    console.error("[payments] save", error.code, error.message);
    return false;
  }
  return true;
}

/** For the owner's setup page: the IDs to paste into Vercel. */
export async function describeStore() {
  const [stores, products, variants] = await Promise.all([
    api<{ data: { id: string; attributes: { name: string; slug: string } }[] }>("/stores"),
    api<{ data: { id: string; attributes: { name: string; store_id: number } }[] }>(
      "/products?page[size]=100",
    ),
    api<{
      data: {
        id: string;
        attributes: {
          product_id: number;
          name: string;
          price: number;
          is_subscription: boolean;
          interval: string | null;
          status: string;
        };
      }[];
    }>("/variants?page[size]=100"),
  ]);

  const productName = new Map(products.data.map((p) => [Number(p.id), p.attributes.name]));
  return {
    stores: stores.data.map((s) => ({ id: s.id, name: s.attributes.name })),
    variants: variants.data.map((v) => ({
      id: v.id,
      product: productName.get(v.attributes.product_id) ?? `product ${v.attributes.product_id}`,
      name: v.attributes.name,
      price: `$${(v.attributes.price / 100).toFixed(2)}`,
      every: v.attributes.is_subscription ? v.attributes.interval : "one-off",
      status: v.attributes.status,
    })),
  };
}
