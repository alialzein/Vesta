import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Server-only auth utilities (see docs/architecture/nextjs-supabase-edge-functions.md).
 * Use these in server components, route handlers, and server actions.
 */

/** Returns the authenticated user, or null. Revalidates the token with Supabase. */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the authenticated user or redirects to /login. Use to guard server
 * components/actions that must have a session. Middleware already protects
 * routes, but this is the defense-in-depth check at the data layer.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Returns the current user's profile row, or null if not signed in / missing. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  return data ?? null;
}
