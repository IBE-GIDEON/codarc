import type { User } from "@/lib/session";
import { entitlement } from "@/lib/accounts";

/**
 * Whether this person may run the actions that cost money — their own plan,
 * a team they belong to, or the owner key. The detail lives in
 * `entitlement()`; this stays as the yes/no most callers want.
 */
export async function hasActivePlan(user: User | null): Promise<boolean> {
  return (await entitlement(user)).plan !== "none";
}
