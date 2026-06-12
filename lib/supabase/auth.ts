import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';
import type { User } from '@supabase/supabase-js';

type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Server-only auth utilities (see docs/reference/architecture/nextjs-supabase-edge-functions.md).
 * Use these in server components, route handlers, and server actions.
 */

/**
 * The authenticated user, or null. Wrapped in React `cache()` so repeated calls
 * within a single request reuse ONE getUser() round-trip instead of each hitting
 * Supabase Auth again (this used to fire ~4x per dashboard load). Revalidates the
 * token with Supabase; the middleware getUser() remains the security checkpoint.
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Returns the authenticated user or redirects to /login. Use to guard server
 * components/actions that must have a session. Middleware already protects
 * routes, but this is the defense-in-depth check at the data layer.
 *
 * Maintenance mode: when the operator flips the switch, every normal user is
 * routed to /maintenance from here — the single gate all app pages and
 * actions pass through (admins keep working; the check is one cached
 * single-row read per request).
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.app_metadata?.is_admin !== true) {
    const { isMaintenanceOn } = await import('@/lib/admin/maintenance');
    if (await isMaintenanceOn()) redirect('/maintenance');
  }
  return user;
}

/**
 * The current user's profile row, or null. Pass the already-fetched user (from
 * requireUser) to skip a redundant getUser() round-trip; otherwise it falls back
 * to the cached one.
 */
export async function getProfile(user?: User | null): Promise<Profile | null> {
  const u = user ?? (await getCurrentUser());
  if (!u) return null;

  const supabase = createClient();
  const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single();
  return data ?? null;
}
