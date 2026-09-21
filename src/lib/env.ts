/**
 * Environment values, trimmed.
 *
 * Copying a key out of a web page drags a space or a newline along with it
 * more often than not, and the failure that causes is silent and miserable to
 * debug — GitHub just refuses the request with no explanation. Every read of
 * a secret goes through here.
 */
export function env(name: string): string | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function hasEnv(name: string): boolean {
  return env(name) !== undefined;
}

/**
 * The Supabase project address, reduced to just `https://<ref>.supabase.co`.
 *
 * Supabase's dashboard also shows the REST address (`…/rest/v1/`), and it's
 * the one people copy. The client adds `/rest/v1` itself, so the doubled path
 * makes every read and write miss (PGRST125) — while reads fail quietly
 * enough to look like empty tables.
 */
export function supabaseUrl(): string | undefined {
  const raw = env("SUPABASE_URL");
  if (!raw) return undefined;
  try {
    return new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`).origin;
  } catch {
    return raw;
  }
}
