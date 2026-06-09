import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Admin (operator-console) authorization. Access is gated on
 * `profiles.role = 'admin'`. Non-admins must not even learn that /admin exists,
 * so guards call `notFound()` (a 404) rather than redirecting.
 *
 * Reads the caller's own profile via the RLS-scoped client (profiles_select_own),
 * so this never leaks other users' rows. `cache()` dedupes the lookup within a
 * single request (layout + page + action can all call it once).
 */
export const getAdminUser = cache(async (): Promise<User | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return data?.role === 'admin' ? user : null;
});

/** True when the current session belongs to an admin. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

/**
 * Guard for admin pages and server actions: returns the admin user, or 404s.
 * Use at the top of every /admin route and every admin server action
 * (defense-in-depth — never rely on the layout gate alone).
 */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) notFound();
  return user;
}
