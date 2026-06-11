'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';

/**
 * Reminders — manager-facing actions. Creation happens via confirmed chat
 * orders (app/actions/chat.ts executeChatAction); here the manager can stop
 * a scheduled series at any time (Settings → Scheduled reminders).
 */

export async function cancelReminder(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase
    .from('reminders')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('status', 'scheduled');
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  return { ok: true };
}
