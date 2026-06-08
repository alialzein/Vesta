import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import type { User } from '@supabase/supabase-js';

/** Display-facing account info derived from the auth user + profile row. */
export type AccountView = {
  fullName: string;
  firstName: string;
  initials: string;
  email: string;
  role: string;
};

/** Turn an email local part into a readable name fallback (e.g. ali.sabbagh -> Ali Sabbagh). */
function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? '';
  const words = local
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'there';
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'V';
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/**
 * Build the display account for the signed-in user, or null if not signed in.
 * Pulls full_name/role from the profiles row, with email-based fallbacks. Pass
 * the already-fetched user (from requireUser) to skip a redundant getUser().
 */
export async function getAccountView(user?: User | null): Promise<AccountView | null> {
  const u = user ?? (await getCurrentUser());
  if (!u) return null;

  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', u.id)
    .single();

  const email = profile?.email ?? u.email ?? '';
  const fullName = profile?.full_name?.trim() || nameFromEmail(email);
  const firstName = fullName.split(/\s+/)[0] || 'there';

  return {
    fullName,
    firstName,
    initials: initialsOf(fullName),
    email,
    role: profile?.role?.trim() || 'Manager',
  };
}
