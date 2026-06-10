/**
 * Initials-avatar helpers shared by the admin Users table and the dashboard
 * radar (same identity language everywhere). Pure — safe to unit-test.
 */

/** Deterministic avatar hue from a stable key (user id, email…), so colors are
 *  stable per person across renders and sessions. */
export function avatarHue(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 360;
  return h;
}

/** "Maya Khoury" → "MK"; falls back to the email local part ("rania.haddad" → "RH").
 *  Org suffixes and punctuation are ignored ("Lina Saad (HR)" → "LS"). */
export function initialsOf(name: string | null | undefined, email?: string | null): string {
  const cleanName = name?.replace(/\(.*?\)/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const source = cleanName || email?.split('@')[0]?.replace(/[._-]+/g, ' ') || '?';
  const words = source.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}
