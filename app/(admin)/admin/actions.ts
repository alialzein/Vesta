'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin/auth';
import { logAdminAction } from '@/lib/admin/audit';
import {
  saveAppSettings,
  saveUserSettings,
  getAppSettings,
  resolveRetention,
  type AppSettingsPatch,
  type UserSettingsPatch,
} from '@/lib/admin/settings';
import { createServiceClient } from '@/lib/supabase/service';
import { syncOutlookForUser, reprocessMailForUser } from '@/lib/sync/outlook';
import { ensureSubscription } from '@/lib/sync/subscriptions';

export type ActionResult = { ok: boolean; message: string };

function ok(message: string): ActionResult {
  return { ok: true, message };
}
function fail(message: string): ActionResult {
  return { ok: false, message };
}

function revalidateAdmin(): void {
  revalidatePath('/admin');
  revalidatePath('/admin/mailboxes');
  revalidatePath('/admin/email');
  revalidatePath('/admin/users');
  revalidatePath('/admin/ai');
}

// ---------------------------------------------------------------------------
// Mailboxes & Sync
// ---------------------------------------------------------------------------
export async function adminForceSync(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    const res = await syncOutlookForUser(userId);
    await logAdminAction({ actorId: admin.id, action: 'force_sync', targetUserId: userId, after: res });
    revalidateAdmin();
    return ok(`Synced — ${res.inbox + res.sent} message(s), ${res.workItems} work item(s).`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Sync failed.');
  }
}

export async function adminReprocess(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    const res = await reprocessMailForUser(userId);
    await logAdminAction({ actorId: admin.id, action: 'reprocess', targetUserId: userId, after: res });
    revalidateAdmin();
    return ok(`Re-processed — ${res.workItems} work item(s), ${res.hidden} hidden.`);
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Re-process failed.');
  }
}

/** Renew (or create) the Graph webhook subscription for one mailbox. */
export async function adminRenewSubscription(mailboxId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const { data: mb } = await svc
    .from('mailboxes')
    .select('id, user_id, integration_id, metadata')
    .eq('id', mailboxId)
    .maybeSingle();
  if (!mb?.integration_id) return fail('Mailbox not found or not connected.');
  try {
    const result = await ensureSubscription(mb as Parameters<typeof ensureSubscription>[0]);
    await logAdminAction({
      actorId: admin.id,
      action: 'renew_subscription',
      targetUserId: mb.user_id,
      metadata: { mailboxId, result },
    });
    revalidateAdmin();
    if (result === 'skipped') {
      return ok('Subscription is already fresh (or webhooks are not configured on this deployment).');
    }
    return ok(result === 'renewed' ? 'Subscription renewed.' : 'Subscription created.');
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Renew failed.');
  }
}

// ---------------------------------------------------------------------------
// Settings (Email retention + AI config share app_settings)
// ---------------------------------------------------------------------------
export async function adminSaveAppSettings(patch: AppSettingsPatch): Promise<ActionResult> {
  const admin = await requireAdmin();
  const before = await getAppSettings();
  await saveAppSettings(patch, admin.id);
  await logAdminAction({
    actorId: admin.id,
    action: 'update_app_settings',
    entityType: 'app_settings',
    before,
    after: patch,
  });
  revalidateAdmin();
  return ok('Settings saved.');
}

export async function adminSaveUserSettings(
  userId: string,
  patch: Omit<UserSettingsPatch, 'user_id'>,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  await saveUserSettings(userId, patch, admin.id);
  await logAdminAction({
    actorId: admin.id,
    action: 'update_user_settings',
    entityType: 'user_settings',
    targetUserId: userId,
    after: patch,
  });
  revalidateAdmin();
  return ok('User settings saved.');
}

// ---------------------------------------------------------------------------
// Email data: retention / soft-delete purge / manual wipe
// ---------------------------------------------------------------------------
async function recordPurge(opts: {
  adminId: string;
  kind: string;
  userId?: string | null;
  rows: number;
  params?: Record<string, unknown>;
}): Promise<void> {
  const svc = createServiceClient();
  await svc.from('purge_jobs').insert({
    kind: opts.kind,
    user_id: opts.userId ?? null,
    status: 'done',
    rows_affected: opts.rows,
    params: (opts.params ?? {}) as never,
    created_by: opts.adminId,
    finished_at: new Date().toISOString(),
  });
}

/** Permanently remove soft-deleted mail past the grace window. */
export async function adminPurgeSoftDeleted(): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const app = await getAppSettings();
  const cutoff = new Date(
    Date.now() - (app.soft_delete_grace_days ?? 30) * 86_400_000,
  ).toISOString();
  const { data, error } = await svc
    .from('email_messages')
    .delete()
    .not('deleted_at', 'is', null)
    .lt('deleted_at', cutoff)
    .select('id');
  if (error) return fail(error.message);
  const rows = data?.length ?? 0;
  await recordPurge({ adminId: admin.id, kind: 'soft_delete', rows, params: { cutoff } });
  await logAdminAction({ actorId: admin.id, action: 'purge_soft_deleted', metadata: { rows, cutoff } });
  revalidateAdmin();
  return ok(`Purged ${rows} soft-deleted message(s).`);
}

/** Purge mail older than the retention window (global or per-user). */
export async function adminApplyRetention(userId?: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const app = await getAppSettings();

  // When a user is given, use their effective window; else the global one.
  const months = userId
    ? (await resolveRetention(userId, app)).retentionMonths
    : app.retention_months;
  if (!months || months <= 0) return fail('No retention window set — nothing purged.');

  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);
  let q = svc.from('email_messages').delete().lt('received_at', cutoff.toISOString());
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q.select('id');
  if (error) return fail(error.message);
  const rows = data?.length ?? 0;
  await recordPurge({
    adminId: admin.id,
    kind: 'retention',
    userId: userId ?? null,
    rows,
    params: { months, cutoff: cutoff.toISOString() },
  });
  await logAdminAction({
    actorId: admin.id,
    action: 'apply_retention',
    targetUserId: userId ?? null,
    metadata: { rows, months },
  });
  revalidateAdmin();
  return ok(`Purged ${rows} message(s) older than ${months} month(s).`);
}

/** Wipe ALL synced mail for a user (keeps the connection/tokens for a re-sync). */
export async function adminWipeUserMail(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const { data, error } = await svc.from('email_messages').delete().eq('user_id', userId).select('id');
  if (error) return fail(error.message);
  // Drop derived rows too so the dashboard clears; tokens/integration stay.
  await svc.from('work_items').delete().eq('user_id', userId).eq('source', 'outlook');
  await svc.from('email_threads').delete().eq('user_id', userId);
  await svc.from('sync_cursors').delete().eq('user_id', userId);
  const rows = data?.length ?? 0;
  await recordPurge({ adminId: admin.id, kind: 'manual_wipe', userId, rows });
  await logAdminAction({ actorId: admin.id, action: 'wipe_user_mail', targetUserId: userId, metadata: { rows } });
  revalidateAdmin();
  return ok(`Wiped ${rows} message(s) for the user. Next sync re-imports from the scan-back window.`);
}

// ---------------------------------------------------------------------------
// Users & Accounts
// ---------------------------------------------------------------------------
/**
 * Grant/revoke operator-console access via the `app_metadata.is_admin` auth claim
 * (NOT profiles.role — that's the job title). Takes effect on the user's next
 * request (getUser() returns fresh app_metadata; a re-login is not required).
 */
export async function adminSetAdmin(userId: string, makeAdmin: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (userId === admin.id && !makeAdmin) return fail('You cannot revoke your own admin access.');
  const svc = createServiceClient();
  const { error } = await svc.auth.admin.updateUserById(userId, {
    app_metadata: { is_admin: makeAdmin },
  });
  if (error) return fail(error.message);
  await logAdminAction({
    actorId: admin.id,
    action: makeAdmin ? 'grant_admin' : 'revoke_admin',
    targetUserId: userId,
  });
  revalidateAdmin();
  return ok(makeAdmin ? 'Granted admin access.' : 'Revoked admin access.');
}

export async function adminSuspendUser(
  userId: string,
  suspend: boolean,
  reason?: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (userId === admin.id) return fail('You cannot suspend your own account.');
  const svc = createServiceClient();

  // Enforce, don't just record: a Supabase ban blocks NEW sign-ins, and the
  // `app_metadata.suspended` claim lets the middleware end any EXISTING session
  // on its next request. profiles.suspended stays as the display/reporting flag.
  const { error: authErr } = await svc.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? '87600h' : 'none', // ~10 years vs lifted
    app_metadata: { suspended: suspend },
  });
  if (authErr) return fail(authErr.message);

  const { error } = await svc
    .from('profiles')
    .update({
      suspended: suspend,
      suspended_at: suspend ? new Date().toISOString() : null,
      suspended_reason: suspend ? reason ?? null : null,
    })
    .eq('id', userId);
  if (error) return fail(error.message);
  await logAdminAction({
    actorId: admin.id,
    action: suspend ? 'suspend_user' : 'unsuspend_user',
    targetUserId: userId,
    metadata: { reason },
  });
  revalidateAdmin();
  return ok(
    suspend
      ? 'Account suspended — sign-in is blocked and any active session ends on its next request.'
      : 'Account re-enabled.',
  );
}

/**
 * Send a password-reset email to the user's account email (profiles.email — the
 * address they signed up with). Supabase's mailer delivers it; the link signs
 * them in and lands on /auth/update-password to choose a new password.
 */
export async function adminResetPassword(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const { data } = await svc.from('profiles').select('email').eq('id', userId).single();
  const email = data?.email;
  if (!email) return fail('No email on file for this user.');
  const origin = headers().get('origin') ?? '';
  const anon = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  // Land directly on the update-password page. Recovery links use the implicit
  // flow (tokens arrive in the URL #hash, which only the browser can read), so
  // the page itself consumes them client-side — routing via /auth/callback would
  // lose them. NOTE: this URL must be covered by the Supabase Auth
  // "Redirect URLs" allow-list or Supabase silently falls back to the Site URL.
  const { error } = await anon.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/update-password`,
  });
  if (error) return fail(error.message);
  await logAdminAction({ actorId: admin.id, action: 'reset_password', targetUserId: userId });
  return ok(`Password-reset email sent to ${email}.`);
}

/**
 * Set a user's password directly (for when email reset isn't practical). The new
 * password is chosen by the operator and never stored or logged — only the fact
 * that it was changed is audited. Takes effect immediately.
 */
export async function adminSetPassword(userId: string, password: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const pwd = password.trim();
  if (pwd.length < 8) return fail('Password must be at least 8 characters.');
  const svc = createServiceClient();
  const { error } = await svc.auth.admin.updateUserById(userId, { password: pwd });
  if (error) return fail(error.message);
  await logAdminAction({ actorId: admin.id, action: 'set_password', targetUserId: userId });
  return ok('Password updated. Share it with the user securely.');
}

/** Send the user back through the first-run onboarding wizard on next visit. */
export async function adminRetriggerOnboarding(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('profiles').update({ onboarded_at: null }).eq('id', userId);
  if (error) return fail(error.message);
  await logAdminAction({ actorId: admin.id, action: 'retrigger_onboarding', targetUserId: userId });
  revalidateAdmin();
  return ok('Onboarding re-triggered — the user sees the welcome wizard on their next visit.');
}

/** Set the user's timezone (profiles.timezone — drives their local-time display). */
export async function adminSetTimezone(userId: string, timezone: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const tz = timezone.trim();
  // Validate against the runtime's IANA zone list so a typo can't corrupt times.
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    return fail(`"${tz}" is not a valid IANA timezone (e.g. Asia/Beirut, Europe/Berlin).`);
  }
  const svc = createServiceClient();
  const { error } = await svc.from('profiles').update({ timezone: tz }).eq('id', userId);
  if (error) return fail(error.message);
  await logAdminAction({
    actorId: admin.id,
    action: 'set_timezone',
    targetUserId: userId,
    after: { timezone: tz },
  });
  revalidateAdmin();
  return ok(`Timezone set to ${tz}.`);
}

/** GDPR-style hard delete: removes the auth user; cascades all owned data. */
export async function adminDeleteUser(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (userId === admin.id) return fail('You cannot delete your own account.');
  const svc = createServiceClient();
  // Best-effort count for the audit trail before the cascade.
  const { count } = await svc
    .from('email_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  const { error } = await svc.auth.admin.deleteUser(userId);
  if (error) return fail(error.message);
  await logAdminAction({
    actorId: admin.id,
    action: 'delete_user',
    targetUserId: userId,
    metadata: { messagesDeleted: count ?? 0 },
  });
  revalidateAdmin();
  return ok('User and all their data deleted.');
}

// ---------------------------------------------------------------------------
// AI: re-analysis controls
// ---------------------------------------------------------------------------
/** Clear last_analyzed_at so the next sync re-runs AI (one user, or everyone). */
export async function adminReanalyze(userId?: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  let q = svc
    .from('work_items')
    .update({ last_analyzed_at: null })
    .eq('status', 'open')
    .not('last_analyzed_at', 'is', null);
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q.select('id');
  if (error) return fail(error.message);
  const rows = data?.length ?? 0;
  await logAdminAction({
    actorId: admin.id,
    action: 'reanalyze',
    targetUserId: userId ?? null,
    metadata: { rows },
  });
  revalidateAdmin();
  return ok(`Queued ${rows} item(s) for re-analysis on the next sync.`);
}

// ---------------------------------------------------------------------------
// Wave 2 — Triage & Rules
// ---------------------------------------------------------------------------
export async function adminToggleRule(ruleId: string, enabled: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('manager_rules').update({ is_enabled: enabled }).eq('id', ruleId);
  if (error) return fail(error.message);
  await logAdminAction({ actorId: admin.id, action: 'toggle_rule', entityType: 'manager_rules', entityId: ruleId, after: { enabled } });
  revalidateAdmin();
  return ok(enabled ? 'Rule enabled.' : 'Rule disabled.');
}

export async function adminDeleteRule(ruleId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('manager_rules').delete().eq('id', ruleId);
  if (error) return fail(error.message);
  await logAdminAction({ actorId: admin.id, action: 'delete_rule', entityType: 'manager_rules', entityId: ruleId });
  revalidateAdmin();
  return ok('Rule deleted.');
}

export async function adminToggleMemory(memoryId: string, active: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('manager_memories').update({ is_active: active }).eq('id', memoryId);
  if (error) return fail(error.message);
  await logAdminAction({ actorId: admin.id, action: 'toggle_memory', entityType: 'manager_memories', entityId: memoryId, after: { active } });
  revalidateAdmin();
  return ok(active ? 'Memory activated.' : 'Memory deactivated.');
}

export async function adminDeleteMemory(memoryId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('manager_memories').delete().eq('id', memoryId);
  if (error) return fail(error.message);
  await logAdminAction({ actorId: admin.id, action: 'delete_memory', entityType: 'manager_memories', entityId: memoryId });
  revalidateAdmin();
  return ok('Memory deleted.');
}

// ---------------------------------------------------------------------------
// Wave 2 — Drafts & Sending
// ---------------------------------------------------------------------------
/** Remove a draft (cleanup of errored/stale drafts). Never sends anything. */
export async function adminDeleteDraft(draftId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const { error } = await svc.from('draft_replies').delete().eq('id', draftId);
  if (error) return fail(error.message);
  await logAdminAction({ actorId: admin.id, action: 'delete_draft', entityType: 'draft_replies', entityId: draftId });
  revalidateAdmin();
  return ok('Draft deleted.');
}

// ---------------------------------------------------------------------------
// Admin Settings (super-admin identity)
// ---------------------------------------------------------------------------

/** Flip maintenance mode: ON locks the app for normal users (they see the
 *  /maintenance screen via requireUser); the console keeps running. */
export async function adminSetMaintenance(on: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  try {
    const settings = await getAppSettings();
    const flags = { ...((settings.feature_flags ?? {}) as Record<string, unknown>), maintenance: on };
    await saveAppSettings({ feature_flags: flags } as AppSettingsPatch, admin.id);
    await logAdminAction({
      actorId: admin.id,
      action: on ? 'maintenance_on' : 'maintenance_off',
      after: { maintenance: on },
    });
    revalidateAdmin();
    revalidatePath('/admin/settings');
    return ok(
      on
        ? 'Maintenance mode is ON - users now see the "back soon" screen.'
        : 'Maintenance mode is OFF - the app is open to users again.',
    );
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Could not change maintenance mode.');
  }
}
