import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/database.types';

/**
 * Server-side Supabase client bound to the request's cookies.
 *
 * Use in server components, route handlers, and server actions. Reads the
 * authenticated session from cookies and relies on RLS for data isolation.
 * Uses the public anon key — never the service role key.
 */
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // In server components, setAll can throw (read-only cookies). That is
          // fine when middleware is refreshing the session; ignore the error.
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a server component without a mutable cookie store.
          }
        },
      },
    },
  );
}
