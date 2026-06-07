'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken, deleteTokens } from '@/lib/graph/tokens';
import { getMe } from '@/lib/graph/client';
import { syncOutlookForUser, type SyncResult } from '@/lib/sync/outlook';
import type { TriageMode } from '@/lib/engine/triage';

/** Find the current user's Microsoft integration id, or null. */
async function getMicrosoftIntegrationId(): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from('user_integrations')
    .select('id')
    .eq('provider', 'microsoft')
    .maybeSingle();
  return data?.id ?? null;
}

/** Disconnect Outlook: delete the encrypted tokens, mailbox(es), and integration. */
export async function disconnectOutlook(): Promise<void> {
  await requireUser();
  const supabase = createClient();
  const integrationId = await getMicrosoftIntegrationId();
  if (integrationId) {
    await deleteTokens(integrationId); // private tokens (service role)
    await supabase.from('mailboxes').delete().eq('integration_id', integrationId);
    await supabase.from('user_integrations').delete().eq('id', integrationId);
  }
  redirect('/settings?outlook=disconnected');
}

export type TestResult = { ok: boolean; email?: string; error?: string };

/** Test the connection by calling Graph /me with a (refreshed) access token. */
export async function testOutlook(): Promise<TestResult> {
  await requireUser();
  const integrationId = await getMicrosoftIntegrationId();
  if (!integrationId) return { ok: false, error: 'No Outlook connection found.' };

  try {
    const token = await getValidAccessToken(integrationId);
    if (!token) return { ok: false, error: 'No valid token — try reconnecting.' };
    const me = await getMe(token);
    return { ok: true, email: me.mail ?? me.userPrincipalName ?? me.displayName ?? 'connected' };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Connection test failed.' };
  }
}

/** Run an initial email sync (recent Inbox + Sent) for the current user. */
export async function syncOutlook(): Promise<SyncResult> {
  const user = await requireUser();
  return syncOutlookForUser(user.id);
}

/**
 * Set what Vesta imports as actionable for the user's active mailbox
 * (focused | flagged | everything). Manager-controlled triage (Phase 6.5).
 */
export async function setTriageMode(mode: TriageMode): Promise<void> {
  await requireUser();
  const supabase = createClient();
  await supabase
    .from('mailboxes')
    .update({ triage_mode: mode })
    .eq('provider', 'microsoft')
    .eq('status', 'active');
  revalidatePath('/settings');
}
