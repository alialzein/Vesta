import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

/**
 * Service-role Supabase client (server-only). Bypasses RLS — use ONLY in trusted
 * server code (route handlers, Edge Functions) for operations the user cannot do
 * directly, such as the SECURITY DEFINER token RPCs that touch private.graph_tokens.
 *
 * NEVER import this into client components or expose the service role key.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase service client requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
