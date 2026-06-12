'use server';

import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Phase C — attendee autocomplete for the meeting confirmation card.
 * Suggestions come from Vesta's OWN data (the `people` table built from the
 * manager's synced mail), VIPs first then most recently seen — no extra Graph
 * permission needed. (Graph /me/people with People.Read is a possible richer
 * source later, per the chat-actions plan.)
 */

export type AttendeeSuggestion = { name: string | null; email: string };

export async function suggestAttendees(query: string): Promise<AttendeeSuggestion[]> {
  await requireUser();
  // Strip PostgREST filter syntax so the term can't break out of the or().
  const q = query.trim().replace(/[,()%_\\]/g, '');
  if (q.length < 2) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from('people')
    .select('display_name, email')
    .not('email', 'is', null)
    .or(`email.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order('is_vip', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(6);
  return (data ?? [])
    .filter((p): p is { display_name: string | null; email: string } => Boolean(p.email))
    .map((p) => ({ name: p.display_name, email: p.email.toLowerCase() }));
}
