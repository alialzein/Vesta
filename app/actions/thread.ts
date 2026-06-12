'use server';

import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Reading-room reply support — the bridge into the existing draft/send
 * pipeline (which is keyed on work items). Replying to a thread that already
 * has a radar item reuses it; a thread without one gets a quiet stub row
 * (status 'done', so the radar never shows it) that exists only to anchor
 * the draft, the audit trail, and the send — all the approval gates and
 * ledgers behave exactly like a dashboard reply.
 */
export async function ensureThreadWorkItem(
  conversationId: string,
): Promise<{ ok: true; workItemId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const convId = String(conversationId ?? '').trim();
  if (!convId || convId.length > 300) return { ok: false, error: 'Invalid conversation.' };

  const supabase = createClient();
  const { data: existing } = await supabase
    .from('work_items')
    .select('id')
    .eq('source', 'outlook')
    .eq('source_external_id', convId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return { ok: true, workItemId: existing.id };

  // Anchor the stub to the thread's latest message (and verify the thread is
  // really the manager's own mail — RLS scopes the read).
  const { data: msg } = await supabase
    .from('email_messages')
    .select('subject, received_at, sent_at')
    .eq('graph_conversation_id', convId)
    .is('deleted_at', null)
    .order('received_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!msg) return { ok: false, error: 'Thread not found.' };

  const nowIso = new Date().toISOString();
  const { data: created, error } = await supabase
    .from('work_items')
    .insert({
      user_id: user.id,
      source: 'outlook',
      source_external_id: convId,
      title: msg.subject?.trim() || '(no subject)',
      category: 'task',
      status: 'done',
      completed_at: nowIso,
      priority_score: 0,
      requires_reply: false,
      urgency_reason: 'Created when you replied from the thread view.',
      metadata: { origin: 'thread_reply' },
    })
    .select('id')
    .single();
  if (error || !created) return { ok: false, error: error?.message ?? 'Could not start the reply.' };
  return { ok: true, workItemId: created.id };
}
