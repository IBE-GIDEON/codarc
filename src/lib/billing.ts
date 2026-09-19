import type { User } from "@/lib/session";
import { isOwner } from "@/lib/owner";

/**
 * Whether this person is allowed to spend money-costing actions.
 *
 * Nobody has a plan yet because Stripe isn't connected — that's the honest
 * state, not a bug. The owner bypasses it so Codarc can be tested and
 * demonstrated before billing exists.
 *
 * When Stripe lands: look the subscription up by `user.id` (the GitHub id,
 * which is stable across renames) and return whether it's active.
 */
export async function hasActivePlan(user: User | null): Promise<boolean> {
  if (!user) return false;
  // Owner bypass — this is how you use your own product pre-launch.
  if (await isOwner()) return true;
  return false;
}
