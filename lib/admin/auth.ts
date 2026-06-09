import 'server-only';
import { notFound } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { getCurrentUser } from '@/lib/supabase/auth';

/**
 * Admin (operator-console) authorization. Access is gated on the Supabase auth
 * claim **`app_metadata.is_admin`** — NOT `profiles.role` (that column is the
 * user's job title, set by onboarding, so it must not carry access meaning).
 * `app_metadata` is server-only (users can't edit it) and travels in the auth
 * token, so the check needs no extra DB read. Non-admins must not even learn
 * that /admin exists, so guards call `notFound()` (a 404) rather than redirecting.
 */
export function isAdminUser(user: User | null): boolean {
  return user?.app_metadata?.is_admin === true;
}

export async function getAdminUser(): Promise<User | null> {
  const user = await getCurrentUser();
  return isAdminUser(user) ? user : null;
}

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
