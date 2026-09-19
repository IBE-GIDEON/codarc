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
