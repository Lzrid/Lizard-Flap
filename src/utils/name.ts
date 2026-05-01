export const MAX_NAME_LENGTH = 14;

/** English letters/digits, plus space, underscore, hyphen. */
export const NAME_RE = /^[A-Za-z0-9 _-]+$/;

export function sanitizeName(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, MAX_NAME_LENGTH);
}

export function isValidName(name: string): boolean {
  if (!name) return false;
  if (name.length > MAX_NAME_LENGTH) return false;
  return NAME_RE.test(name);
}
