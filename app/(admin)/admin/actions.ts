'use server';

import { revalidatePath } from 'next/cache';
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
  return ok(suspend ? 'Account suspended.' : 'Account re-enabled.');
}

/** Send a password-reset email to the user (Supabase delivers it). */
export async function adminResetPassword(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const { data } = await svc.from('profiles').select('email').eq('id', userId).single();
  const email = data?.email;
  if (!email) return fail('No email on file for this user.');
  const anon = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { error } = await anon.auth.resetPasswordForEmail(email);
  if (error) return fail(error.message);
  await logAdminAction({ actorId: admin.id, action: 'reset_password', targetUserId: userId });
  return ok(`Password-reset email sent to ${email}.`);
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
