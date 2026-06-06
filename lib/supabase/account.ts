import { createClient } from '@/lib/supabase/server';

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
 * Pulls full_name/role from the profiles row, with email-based fallbacks.
 */
export async function getAccountView(): Promise<AccountView | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .single();

  const email = profile?.email ?? user.email ?? '';
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
