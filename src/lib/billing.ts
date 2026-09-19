import type { User } from "@/lib/session";
import { isOwner, lockEnabled } from "@/lib/owner";

/**
 * Whether this person may run the actions that cost money.
 *
 * Nobody has a plan yet because Stripe isn't connected — that's the honest
 * state, not a bug, and this function is the single place it changes when
 * billing lands. Look the subscription up by `user.id` (the GitHub id, stable
 * across renames) and return whether it's active.
 *
 * The owner bypass is deliberately narrow: it applies only when an owner key
 * is actually set AND the visitor holds it. `isOwner()` on its own returns
 * true when no key is configured — right for "don't spend my money", very
 * wrong here, because it would hand every signed-in visitor a free plan and
 * the paywall would never appear.
 */
export async function hasActivePlan(user: User | null): Promise<boolean> {
  if (!user) return false;
  if (lockEnabled() && (await isOwner())) return true;
  return false;
}
