'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken, deleteTokens } from '@/lib/graph/tokens';
import { getMe } from '@/lib/graph/client';
import { syncOutlookForUser, reprocessMailForUser, type SyncResult } from '@/lib/sync/outlook';
import { removeSubscriptionForMailbox } from '@/lib/sync/subscriptions';
import type { TriageMode } from '@/lib/engine/triage';
import { isValidTimeZone } from '@/lib/time/zone';

/**
 * Timezone (manager-timezone pass) — due dates, day buckets, the daily-brief
 * date, and AI date labels all follow `profiles.timezone`. The browser reports
 * the device zone on app load (TimezoneSync); a manual pick in Settings pins it
 * (recorded as `tz_manual` in the auth user metadata — no schema change) and
 * auto-detection then leaves it alone.
 */

/** Auto-detect (fire-and-forget from the client). Respects a manual pin. */
export async function reportDetectedTimezone(tz: string): Promise<void> {
  if (!isValidTimeZone(tz)) return;
  const user = await requireUser();
  if (user.user_metadata?.tz_manual === true) return; // pinned in Settings
  const supabase = createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();
  if (profile && profile.timezone !== tz) {
    await supabase.from('profiles').update({ timezone: tz }).eq('id', user.id);
  }
}

export type TimezoneResult = { ok: boolean; error?: string };

/** Settings: pin a timezone manually, or return to following the device. */
export async function setTimezonePreference(
  mode: 'auto' | 'manual',
  tz: string,
): Promise<TimezoneResult> {
  if (!isValidTimeZone(tz)) return { ok: false, error: 'That timezone is not recognized.' };
  const user = await requireUser();
  const supabase = createClient();
  const { error: authError } = await supabase.auth.updateUser({
    data: { tz_manual: mode === 'manual' },
  });
  if (authError) return { ok: false, error: authError.message };
  const { error } = await supabase.from('profiles').update({ timezone: tz }).eq('id', user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/settings');
  revalidatePath('/');
  return { ok: true };
}

/** Re-run triage over stored mail and refresh the mail-facing views. */
async function reprocessAndRevalidate(userId: string): Promise<SyncResult> {
  const result = await reprocessMailForUser(userId);
  revalidatePath('/settings');
  revalidatePath('/inbox');
  revalidatePath('/priorities');
  revalidatePath('/hidden');
  return result;
}

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
    // Drop the Graph subscription before the tokens are gone (best-effort).
    const { data: mb } = await supabase
      .from('mailboxes')
      .select('id, user_id, integration_id, metadata')
      .eq('integration_id', integrationId)
      .maybeSingle();
    if (mb) await removeSubscriptionForMailbox(mb);
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

/** Connection + last-sync status, for the background auto-sync (Phase 5). */
export async function getSyncStatus(): Promise<{ connected: boolean; lastSyncAt: string | null }> {
  await requireUser();
  const supabase = createClient();
  const [{ data: mailbox }, { data: cursor }] = await Promise.all([
    supabase
      .from('mailboxes')
      .select('id')
      .eq('provider', 'microsoft')
      .eq('status', 'active')
      .maybeSingle(),
    supabase
      .from('sync_cursors')
      .select('last_success_at')
      .eq('resource_type', 'messages')
      .eq('resource_id', 'all')
      .maybeSingle(),
  ]);
  return { connected: Boolean(mailbox?.id), lastSyncAt: cursor?.last_success_at ?? null };
}

/**
 * Set what Vesta imports as actionable for the user's active mailbox
 * (focused | flagged | everything), then re-run triage over stored mail so the
 * change takes effect immediately. Manager-controlled triage (Phase 6.5).
 */
export async function setTriageMode(mode: TriageMode): Promise<SyncResult> {
  const user = await requireUser();
  const supabase = createClient();
  await supabase
    .from('mailboxes')
    .update({ triage_mode: mode })
    .eq('provider', 'microsoft')
    .eq('status', 'active');
  return reprocessAndRevalidate(user.id);
}

/** Always import mail from this sender (creates an allow rule), then re-process. */
export async function alwaysAllowSender(email: string): Promise<SyncResult> {
  const user = await requireUser();
  const value = email.trim().toLowerCase();
  const supabase = createClient();
  if (value) {
    // Drop any conflicting mute for this sender, then add the allow rule.
    const { data: rules } = await supabase
      .from('manager_rules')
      .select('id, rule_type, conditions')
      .eq('user_id', user.id)
      .in('rule_type', ['allow', 'suppression']);
    const dupe = (rules ?? []).find((r) => {
      const c = (r.conditions ?? {}) as { value?: string };
      return c.value === value;
    });
    if (dupe)
      await supabase.from('manager_rules').delete().eq('id', dupe.id).eq('user_id', user.id);
    await supabase.from('manager_rules').insert({
      user_id: user.id,
      name: `Always allow ${value}`,
      rule_type: 'allow',
      conditions: { match: 'sender', value },
      created_from: 'manual',
    });
  }
  return reprocessAndRevalidate(user.id);
}

/** Hide mail from this sender from now on (creates a suppression rule). */
export async function muteSender(email: string): Promise<SyncResult> {
  const user = await requireUser();
  const value = email.trim().toLowerCase();
  const supabase = createClient();
  if (value) {
    await supabase.from('manager_rules').insert({
      user_id: user.id,
      name: `Mute ${value}`,
      rule_type: 'suppression',
      conditions: { match: 'sender', value },
      created_from: 'manual',
    });
  }
  return reprocessAndRevalidate(user.id);
}

/** Mark/unmark a person as VIP (always imported), then re-process. */
export async function setSenderVip(
  email: string,
  isVip: boolean,
  displayName?: string | null,
): Promise<SyncResult> {
  const user = await requireUser();
  const value = email.trim().toLowerCase();
  const supabase = createClient();
  if (value) {
    await supabase.from('people').upsert(
      {
        user_id: user.id,
        email: value,
        display_name: displayName ?? null,
        is_vip: isVip,
      },
      { onConflict: 'user_id,email' },
    );
  }
  return reprocessAndRevalidate(user.id);
}

/** Remove a manager rule (mute/allow), then re-process. */
export async function removeTriageRule(id: string): Promise<SyncResult> {
  const user = await requireUser();
  const supabase = createClient();
  await supabase.from('manager_rules').delete().eq('id', id).eq('user_id', user.id);
  return reprocessAndRevalidate(user.id);
}
