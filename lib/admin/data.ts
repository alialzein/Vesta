import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import { getConfiguredAiRates } from '@/lib/admin/settings';
import {
  dailySeries,
  heaviestCalls,
  rollupByKind,
  rowKind,
  type DayPoint,
  type HeavyCall,
  type KindRollup,
  type UsageRow,
} from '@/lib/admin/ai-usage';

/**
 * Cost of one ledger row for display: the stored estimate when present, else
 * computed from its tokens × the currently configured rates. Rows recorded (or
 * backfilled) before prices were set therefore still show real dollars.
 */
type UsageTokens = {
  token_input: number | null;
  token_output: number | null;
  cost_estimate_usd: number | string | null;
};
function rowCostUsd(r: UsageTokens, rates: { input: number; output: number } | null): number {
  if (r.cost_estimate_usd !== null && r.cost_estimate_usd !== undefined) {
    return Number(r.cost_estimate_usd);
  }
  if (!rates) return 0;
  return (
    (Number(r.token_input ?? 0) * rates.input + Number(r.token_output ?? 0) * rates.output) /
    1_000_000
  );
}

/**
 * Cross-user read queries for the operator console. These use the SERVICE-ROLE
 * client (bypasses RLS) and are only ever called from /admin pages/actions that
 * have already passed `requireAdmin()`. They power the Health, Users, Mailboxes,
 * Email and AI tabs.
 */

const STALE_SYNC_MINUTES = 30;

export type HealthOverview = {
  users: { total: number; admins: number; suspended: number; connected: number };
  sync: { mailboxes: number; stale: number; errored: number; lastSuccessAt: string | null };
  webhooks: { pending: number; errored: number };
  /** AI usage within the requested date range (Overview's range filter). */
  ai: { cost: number; calls: number; tokens: number };
  /** Assistant queues — what Vesta owes people (live, not range-filtered). */
  reminders: { scheduled: number; overdue: number; failed: number };
  drafts: { pending: number };
  errors: ErrorFeedItem[];
};

export type ErrorFeedItem = {
  source: string; // sync | webhook | ai
  message: string;
  at: string | null;
  who: string | null;
};

function startOfTodayIso(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}
function startOfMonthIso(): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * @param aiSinceIso AI usage is summed from this instant (the Overview range
 *                   filter; default = start of the current calendar month).
 */
export async function getHealthOverview(aiSinceIso?: string): Promise<HealthOverview> {
  const svc = createServiceClient();
  const sinceIso = aiSinceIso ?? startOfMonthIso();
  const staleCutoff = new Date(Date.now() - STALE_SYNC_MINUTES * 60_000).toISOString();

  const [
    profilesRes,
    mailboxesRes,
    cursorsRes,
    webhookPendingRes,
    webhookErrRes,
    usageRes,
    aiErrRes,
    usageErrRes,
    remindersRes,
    draftsPendingRes,
    authListRes,
  ] = await Promise.all([
    svc.from('profiles').select('id, role, suspended'),
    svc.from('mailboxes').select('id').eq('status', 'active'),
    svc.from('sync_cursors').select('last_success_at, last_error, user_id, resource_type'),
    svc.from('webhook_events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    svc
      .from('webhook_events')
      .select('error, created_at, provider')
      .not('error', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5),
    svc.from('ai_usage').select('cost_estimate_usd, token_input, token_output').gte('created_at', sinceIso),
    svc
      .from('ai_analyses')
      .select('error, created_at, user_id')
      .not('error', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5),
    // Failed chat/draft/brief calls live in ai_usage, not ai_analyses.
    svc
      .from('ai_usage')
      .select('error, created_at, user_id, feature')
      .not('error', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5),
    svc.from('reminders').select('status, remind_at'),
    svc
      .from('draft_replies')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'edited', 'approved']),
    svc.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const adminCount = (authListRes.data?.users ?? []).filter(
    (u) => u.app_metadata?.is_admin === true,
  ).length;
  const profiles = profilesRes.data ?? [];
  const cursors = cursorsRes.data ?? [];
  const lastSuccess = cursors
    .map((c) => c.last_success_at)
    .filter(Boolean)
    .sort()
    .at(-1) as string | null | undefined;

  const rates = await getConfiguredAiRates();
  const usage = usageRes.data ?? [];
  const aiCost = usage.reduce((s, r) => s + rowCostUsd(r, rates), 0);
  const aiTokens = usage.reduce(
    (s, r) => s + Number(r.token_input ?? 0) + Number(r.token_output ?? 0),
    0,
  );

  const errors: ErrorFeedItem[] = [
    ...cursors
      .filter((c) => c.last_error)
      .map((c) => ({
        source: 'sync',
        message: c.last_error as string,
        at: c.last_success_at,
        who: c.user_id,
      })),
    ...(webhookErrRes.data ?? []).map((w) => ({
      source: 'webhook',
      message: w.error as string,
      at: w.created_at,
      who: w.provider,
    })),
    ...(aiErrRes.data ?? []).map((a) => ({
      source: 'ai',
      message: a.error as string,
      at: a.created_at,
      who: a.user_id,
    })),
    ...(usageErrRes.data ?? []).map((u) => ({
      source: `ai · ${u.feature}`,
      message: u.error as string,
      at: u.created_at,
      who: u.user_id,
    })),
  ]
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
    .slice(0, 12);

  const reminderRows = remindersRes.data ?? [];
  const nowIso = new Date(Date.now() - 10 * 60_000).toISOString(); // 10 min grace for the cron

  return {
    users: {
      total: profiles.length,
      admins: adminCount,
      suspended: profiles.filter((p) => p.suspended).length,
      connected: mailboxesRes.data?.length ?? 0,
    },
    sync: {
      mailboxes: mailboxesRes.data?.length ?? 0,
      stale: cursors.filter(
        (c) => c.resource_type === 'messages' && (!c.last_success_at || c.last_success_at < staleCutoff),
      ).length,
      errored: cursors.filter((c) => c.last_error).length,
      lastSuccessAt: lastSuccess ?? null,
    },
    webhooks: {
      pending: webhookPendingRes.count ?? 0,
      errored: webhookErrRes.data?.length ?? 0,
    },
    ai: { cost: aiCost, calls: usage.length, tokens: aiTokens },
    reminders: {
      scheduled: reminderRows.filter((r) => r.status === 'scheduled').length,
      overdue: reminderRows.filter((r) => r.status === 'scheduled' && r.remind_at < nowIso).length,
      failed: reminderRows.filter((r) => r.status === 'failed').length,
    },
    drafts: { pending: draftsPendingRes.count ?? 0 },
    errors,
  };
}

// ---------------------------------------------------------------------------
// Mailboxes & Sync
// ---------------------------------------------------------------------------
export type MailboxRow = {
  id: string;
  userId: string;
  email: string | null;
  mailboxEmail: string | null;
  status: string;
  integrationStatus: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  triageMode: string | null;
  /** Graph webhook subscription expiry (from mailboxes.metadata), if any. */
  subscriptionExpiresAt: string | null;
};

export async function listMailboxes(): Promise<MailboxRow[]> {
  const svc = createServiceClient();
  const [{ data: mailboxes }, { data: integrations }, { data: cursors }, { data: profiles }] =
    await Promise.all([
      svc
        .from('mailboxes')
        .select('id, user_id, integration_id, mailbox_email, status, last_sync_at, triage_mode, metadata')
        .order('created_at', { ascending: true }),
      svc.from('user_integrations').select('id, status, last_error'),
      svc.from('sync_cursors').select('user_id, last_success_at, last_error, resource_type'),
      svc.from('profiles').select('id, email'),
    ]);

  const integrationById = new Map((integrations ?? []).map((i) => [i.id, i]));
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const cursorByUser = new Map<string, { last_success_at: string | null; last_error: string | null }>();
  for (const c of cursors ?? []) {
    if (c.resource_type !== 'messages') continue;
    cursorByUser.set(c.user_id, { last_success_at: c.last_success_at, last_error: c.last_error });
  }

  return (mailboxes ?? []).map((m) => {
    const integ = m.integration_id ? integrationById.get(m.integration_id) : undefined;
    const cur = cursorByUser.get(m.user_id);
    const sub = (m.metadata as { subscription?: { expiresAt?: string } } | null)?.subscription;
    return {
      id: m.id,
      userId: m.user_id,
      email: emailById.get(m.user_id) ?? null,
      mailboxEmail: m.mailbox_email,
      status: m.status,
      integrationStatus: integ?.status ?? null,
      lastSyncAt: cur?.last_success_at ?? m.last_sync_at ?? null,
      lastError: cur?.last_error ?? integ?.last_error ?? null,
      triageMode: (m as { triage_mode?: string | null }).triage_mode ?? null,
      subscriptionExpiresAt: sub?.expiresAt ?? null,
    };
  });
}

// ---------------------------------------------------------------------------
// Email Data & Retention
// ---------------------------------------------------------------------------
export type StorageRow = {
  userId: string;
  email: string | null;
  total: number;
  hidden: number;
  softDeleted: number;
  oldest: string | null;
};

export async function getStorageByUser(): Promise<{ rows: StorageRow[]; totals: StorageRow }> {
  const svc = createServiceClient();
  const [{ data: profiles }, { data: messages }] = await Promise.all([
    svc.from('profiles').select('id, email'),
    // Pull the lightweight columns we aggregate in JS (counts + min date).
    svc.from('email_messages').select('user_id, excluded_at, deleted_at, received_at'),
  ]);

  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const byUser = new Map<string, StorageRow>();
  let tTotal = 0,
    tHidden = 0,
    tDeleted = 0;
  let tOldest: string | null = null;

  for (const m of messages ?? []) {
    const row =
      byUser.get(m.user_id) ??
      ({ userId: m.user_id, email: emailById.get(m.user_id) ?? null, total: 0, hidden: 0, softDeleted: 0, oldest: null } as StorageRow);
    row.total++;
    tTotal++;
    if (m.excluded_at) {
      row.hidden++;
      tHidden++;
    }
    if (m.deleted_at) {
      row.softDeleted++;
      tDeleted++;
    }
    if (m.received_at && (!row.oldest || m.received_at < row.oldest)) row.oldest = m.received_at;
    if (m.received_at && (!tOldest || m.received_at < tOldest)) tOldest = m.received_at;
    byUser.set(m.user_id, row);
  }

  const rows = [...byUser.values()].sort((a, b) => b.total - a.total);
  return {
    rows,
    totals: { userId: '', email: null, total: tTotal, hidden: tHidden, softDeleted: tDeleted, oldest: tOldest },
  };
}

// ---------------------------------------------------------------------------
// Users & Accounts
// ---------------------------------------------------------------------------
export type AdminUserRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: string | null; // job title (from onboarding), display only
  isAdmin: boolean; // operator-console access (app_metadata.is_admin)
  suspended: boolean;
  onboardedAt: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  /** Where the latest recorded sign-in came from ("City, CC" / IP), if known. */
  lastLoginFrom: string | null;
  connected: boolean;
  lastSyncAt: string | null;
  messageCount: number;
};

/** "City, CC" → fall back to country → IP → null. */
function loginPlace(meta: unknown): string | null {
  const m = (meta ?? {}) as { city?: string | null; country?: string | null; ip?: string | null };
  if (m.city && m.country) return `${m.city}, ${m.country}`;
  if (m.city) return m.city;
  if (m.country) return m.country;
  return m.ip ?? null;
}

export async function listUsers(): Promise<AdminUserRow[]> {
  const svc = createServiceClient();
  const [{ data: profiles }, { data: mailboxes }, { data: cursors }, authList, { data: logins }] =
    await Promise.all([
      svc.from('profiles').select('id, email, full_name, role, suspended, onboarded_at, created_at'),
      svc.from('mailboxes').select('user_id, last_sync_at').eq('status', 'active'),
      svc.from('sync_cursors').select('user_id, last_success_at, resource_type'),
      svc.auth.admin.listUsers({ perPage: 1000 }),
      svc
        .from('audit_logs')
        .select('user_id, metadata, created_at')
        .eq('action', 'login')
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

  const connectedUsers = new Map((mailboxes ?? []).map((m) => [m.user_id, m.last_sync_at]));
  const lastSyncByUser = new Map<string, string | null>();
  for (const c of cursors ?? []) {
    if (c.resource_type === 'messages') lastSyncByUser.set(c.user_id, c.last_success_at);
  }
  const authById = new Map((authList.data?.users ?? []).map((u) => [u.id, u]));
  // Newest-first, so the first login seen per user is their latest.
  const loginByUser = new Map<string, string | null>();
  for (const l of logins ?? []) {
    if (l.user_id && !loginByUser.has(l.user_id)) loginByUser.set(l.user_id, loginPlace(l.metadata));
  }

  // Message counts per user (one grouped pass).
  const { data: msgs } = await svc.from('email_messages').select('user_id');
  const countByUser = new Map<string, number>();
  for (const m of msgs ?? []) countByUser.set(m.user_id, (countByUser.get(m.user_id) ?? 0) + 1);

  return (profiles ?? [])
    .map((p) => {
      const auth = authById.get(p.id);
      return {
        id: p.id,
        email: p.email,
        fullName: p.full_name,
        role: p.role,
        isAdmin: auth?.app_metadata?.is_admin === true,
        suspended: p.suspended,
        onboardedAt: p.onboarded_at,
        createdAt: p.created_at,
        lastSignInAt: auth?.last_sign_in_at ?? null,
        lastLoginFrom: loginByUser.get(p.id) ?? null,
        connected: connectedUsers.has(p.id),
        lastSyncAt: lastSyncByUser.get(p.id) ?? connectedUsers.get(p.id) ?? null,
        messageCount: countByUser.get(p.id) ?? 0,
      };
    })
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Per-user detail (Wave 3) — everything the operator needs about ONE account.
// ---------------------------------------------------------------------------
export type UserDetail = {
  profile: {
    id: string;
    email: string | null;
    fullName: string | null;
    role: string | null;
    timezone: string;
    suspended: boolean;
    suspendedReason: string | null;
    onboardedAt: string | null;
    createdAt: string;
  };
  auth: {
    lastSignInAt: string | null;
    isAdmin: boolean;
    emailConfirmedAt: string | null;
    /** Where the latest recorded sign-in came from ("City, CC" / IP), if known. */
    lastLoginFrom: string | null;
  };
  mailbox: {
    connected: boolean;
    email: string | null;
    status: string | null;
    triageMode: string | null;
    lastSyncAt: string | null;
    lastError: string | null;
  };
  counts: { messages: number; hidden: number; openItems: number; draftsSent: number };
  settings: { replyIntentMode: string | null; draftSendMode: string | null; aiPaused: boolean; retentionMonths: number | null } | null;
  drafts: { id: string; status: string; subject: string | null; at: string; error: string | null }[];
  aiMonth: { calls: number; tokens: number; cost: number };
  /** Audit trail rows where this user is the target OR the actor (logins, sends, admin actions on them). */
  audit: { id: string; at: string; action: string; actorType: string; metadata: unknown }[];
};

export async function getUserDetail(userId: string): Promise<UserDetail | null> {
  const svc = createServiceClient();
  const monthIso = startOfMonthIso();

  const [
    { data: p },
    authRes,
    { data: mailbox },
    { data: cursor },
    msgAll,
    msgHidden,
    itemsOpen,
    draftsSentRes,
    { data: settings },
    { data: drafts },
    { data: usage },
    { data: audit },
  ] = await Promise.all([
    svc
      .from('profiles')
      .select('id, email, full_name, role, timezone, suspended, suspended_reason, onboarded_at, created_at')
      .eq('id', userId)
      .maybeSingle(),
    svc.auth.admin.getUserById(userId),
    svc
      .from('mailboxes')
      .select('mailbox_email, status, triage_mode, last_sync_at, integration_id')
      .eq('user_id', userId)
      .eq('provider', 'microsoft')
      .maybeSingle(),
    svc
      .from('sync_cursors')
      .select('last_success_at, last_error')
      .eq('user_id', userId)
      .eq('resource_type', 'messages')
      .maybeSingle(),
    svc.from('email_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    svc
      .from('email_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('excluded_at', 'is', null),
    svc
      .from('work_items')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'open'),
    svc
      .from('draft_replies')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'sent'),
    svc.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    svc
      .from('draft_replies')
      .select('id, status, subject, created_at, sent_at, error')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    svc
      .from('ai_usage')
      .select('token_input, token_output, cost_estimate_usd')
      .eq('user_id', userId)
      .gte('created_at', monthIso),
    svc
      .from('audit_logs')
      .select('id, created_at, action, actor_type, metadata, user_id, actor_id')
      .or(`user_id.eq.${userId},actor_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (!p) return null;
  const authUser = authRes.data?.user;
  const rates = await getConfiguredAiRates();

  return {
    profile: {
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      role: p.role,
      timezone: p.timezone ?? 'UTC',
      suspended: p.suspended,
      suspendedReason: p.suspended_reason,
      onboardedAt: p.onboarded_at,
      createdAt: p.created_at,
    },
    auth: {
      lastSignInAt: authUser?.last_sign_in_at ?? null,
      isAdmin: authUser?.app_metadata?.is_admin === true,
      emailConfirmedAt: authUser?.email_confirmed_at ?? null,
      lastLoginFrom: loginPlace(
        (audit ?? []).find((a) => a.action === 'login')?.metadata ?? null,
      ),
    },
    mailbox: {
      connected: !!mailbox?.integration_id && mailbox.status === 'active',
      email: mailbox?.mailbox_email ?? null,
      status: mailbox?.status ?? null,
      triageMode: mailbox?.triage_mode ?? null,
      lastSyncAt: cursor?.last_success_at ?? mailbox?.last_sync_at ?? null,
      lastError: cursor?.last_error ?? null,
    },
    counts: {
      messages: msgAll.count ?? 0,
      hidden: msgHidden.count ?? 0,
      openItems: itemsOpen.count ?? 0,
      draftsSent: draftsSentRes.count ?? 0,
    },
    settings: settings
      ? {
          replyIntentMode: settings.reply_intent_mode,
          draftSendMode: settings.draft_send_mode,
          aiPaused: settings.ai_paused,
          retentionMonths: settings.retention_months,
        }
      : null,
    drafts: (drafts ?? []).map((d) => ({
      id: d.id,
      status: d.status,
      subject: d.subject,
      at: d.sent_at ?? d.created_at,
      error: d.error,
    })),
    aiMonth: {
      calls: (usage ?? []).length,
      tokens: (usage ?? []).reduce(
        (s, r) => s + Number(r.token_input ?? 0) + Number(r.token_output ?? 0),
        0,
      ),
      cost: (usage ?? []).reduce((s, r) => s + rowCostUsd(r, rates), 0),
    },
    audit: (audit ?? []).map((a) => ({
      id: a.id,
      at: a.created_at,
      action: a.action,
      actorType: a.actor_type,
      metadata: a.metadata,
    })),
  };
}

// ---------------------------------------------------------------------------
// AI Control Center
// ---------------------------------------------------------------------------
export type AiUsageSummary = {
  costToday: number;
  costMonth: number;
  tokensMonth: number;
  callsMonth: number;
  byFeature: { feature: string; calls: number; tokens: number; cost: number }[];
  /** The real "what is consuming" view: feature/kind rollups, hungriest first. */
  byKind: KindRollup[];
  /** Last 14 UTC days, oldest → newest, gaps zero-filled. */
  days: DayPoint[];
  /** The heaviest single calls this month. */
  heaviest: (Omit<HeavyCall, 'who'> & { who: string | null })[];
  byUser: { userId: string; email: string | null; calls: number; tokens: number; cost: number }[];
  recent: {
    at: string;
    feature: string;
    kind: string;
    model: string | null;
    tokens: number;
    cost: number | null;
    error: string | null;
    who: string | null;
  }[];
  analysis: { total: number; analyzed: number; never: number };
};

export async function getAiUsageSummary(): Promise<AiUsageSummary> {
  const svc = createServiceClient();
  const monthIso = startOfMonthIso();
  const todayIso = startOfTodayIso();
  const fortnightIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const sinceIso = monthIso < fortnightIso ? monthIso : fortnightIso;

  const [{ data: usage }, { data: profiles }, { data: items }, { data: recent }] = await Promise.all(
    [
      svc
        .from('ai_usage')
        .select(
          'user_id, feature, model, token_input, token_output, cost_estimate_usd, created_at, error, metadata',
        )
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: false })
        .limit(5000),
      svc.from('profiles').select('id, email'),
      svc.from('work_items').select('last_analyzed_at').eq('status', 'open'),
      svc
        .from('ai_usage')
        .select(
          'created_at, feature, model, token_input, token_output, cost_estimate_usd, error, user_id, metadata',
        )
        .order('created_at', { ascending: false })
        .limit(20),
    ],
  );

  const rates = await getConfiguredAiRates();
  const emailById = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const all = (usage ?? []) as UsageRow[];
  const rows = all.filter((r) => r.created_at >= monthIso);
  const tokens = (r: { token_input: number | null; token_output: number | null }) =>
    Number(r.token_input ?? 0) + Number(r.token_output ?? 0);

  const featureMap = new Map<string, { calls: number; tokens: number; cost: number }>();
  const userMap = new Map<string, { calls: number; tokens: number; cost: number }>();
  let costToday = 0;
  for (const r of rows) {
    const cost = rowCostUsd(r, rates);
    const f = featureMap.get(r.feature) ?? { calls: 0, tokens: 0, cost: 0 };
    f.calls++;
    f.tokens += tokens(r);
    f.cost += cost;
    featureMap.set(r.feature, f);

    const uid = r.user_id ?? 'unknown';
    const u = userMap.get(uid) ?? { calls: 0, tokens: 0, cost: 0 };
    u.calls++;
    u.tokens += tokens(r);
    u.cost += cost;
    userMap.set(uid, u);

    if (r.created_at >= todayIso) costToday += cost;
  }

  const openItems = items ?? [];
  return {
    costToday,
    costMonth: rows.reduce((s, r) => s + rowCostUsd(r, rates), 0),
    tokensMonth: rows.reduce((s, r) => s + tokens(r), 0),
    callsMonth: rows.length,
    byFeature: [...featureMap.entries()]
      .map(([feature, v]) => ({ feature, ...v }))
      .sort((a, b) => b.cost - a.cost),
    byKind: rollupByKind(rows, rates),
    days: dailySeries(all, 14, rates),
    heaviest: heaviestCalls(rows, rates, 8).map((h) => ({
      ...h,
      who: h.who ? emailById.get(h.who) ?? h.who : null,
    })),
    byUser: [...userMap.entries()]
      .map(([userId, v]) => ({ userId, email: emailById.get(userId) ?? null, ...v }))
      .sort((a, b) => b.cost - a.cost),
    recent: ((recent ?? []) as UsageRow[]).map((r) => ({
      at: r.created_at,
      feature: r.feature,
      kind: rowKind(r),
      model: r.model,
      tokens: tokens(r),
      cost: r.cost_estimate_usd === null && !rates ? null : rowCostUsd(r, rates),
      error: r.error,
      who: r.user_id ? emailById.get(r.user_id) ?? r.user_id : null,
    })),
    analysis: {
      total: openItems.length,
      analyzed: openItems.filter((i) => i.last_analyzed_at).length,
      never: openItems.filter((i) => !i.last_analyzed_at).length,
    },
  };
}

// ---------------------------------------------------------------------------
// Wave 2 — Triage & Rules
// ---------------------------------------------------------------------------
async function emailMap(svc: ReturnType<typeof createServiceClient>): Promise<Map<string, string | null>> {
  const { data } = await svc.from('profiles').select('id, email');
  return new Map((data ?? []).map((p) => [p.id, p.email]));
}

export type RuleRow = {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  ruleType: string | null;
  enabled: boolean;
  match: string | null;
  value: string | null;
  createdFrom: string | null;
  createdAt: string;
};

export async function listManagerRules(): Promise<RuleRow[]> {
  const svc = createServiceClient();
  const [emails, { data }] = await Promise.all([
    emailMap(svc),
    svc
      .from('manager_rules')
      .select('id, user_id, name, rule_type, is_enabled, conditions, created_from, created_at')
      .order('created_at', { ascending: false }),
  ]);
  return (data ?? []).map((r) => {
    const c = (r.conditions ?? {}) as { match?: string; value?: string };
    return {
      id: r.id,
      userId: r.user_id,
      email: emails.get(r.user_id) ?? null,
      name: r.name,
      ruleType: r.rule_type,
      enabled: r.is_enabled,
      match: c.match ?? null,
      value: c.value ?? null,
      createdFrom: r.created_from,
      createdAt: r.created_at,
    };
  });
}

export type MemoryRow = {
  id: string;
  userId: string;
  email: string | null;
  memoryType: string | null;
  text: string | null;
  active: boolean;
  scope: string | null;
  createdAt: string;
};

export async function listManagerMemories(): Promise<MemoryRow[]> {
  const svc = createServiceClient();
  const [emails, { data }] = await Promise.all([
    emailMap(svc),
    svc
      .from('manager_memories')
      .select('id, user_id, memory_type, memory_text, is_active, scope, created_at')
      .order('created_at', { ascending: false }),
  ]);
  return (data ?? []).map((m) => ({
    id: m.id,
    userId: m.user_id,
    email: emails.get(m.user_id) ?? null,
    memoryType: m.memory_type,
    text: m.memory_text,
    active: m.is_active,
    scope: m.scope,
    createdAt: m.created_at,
  }));
}

export type FeedbackRow = {
  id: string;
  email: string | null;
  eventType: string | null;
  text: string | null;
  at: string;
};

export async function listFeedbackEvents(limit = 50): Promise<FeedbackRow[]> {
  const svc = createServiceClient();
  const [emails, { data }] = await Promise.all([
    emailMap(svc),
    svc
      .from('feedback_events')
      .select('id, user_id, event_type, feedback_text, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);
  return (data ?? []).map((f) => ({
    id: f.id,
    email: emails.get(f.user_id) ?? null,
    eventType: f.event_type,
    text: f.feedback_text,
    at: f.created_at,
  }));
}

// ---------------------------------------------------------------------------
// Wave 2 — Drafts & Sending
// ---------------------------------------------------------------------------
export type DraftRow = {
  id: string;
  email: string | null;
  status: string;
  subject: string | null;
  model: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  error: string | null;
  createdAt: string;
};

export type DraftsOverview = {
  byStatus: { status: string; count: number }[];
  sent: number;
  errored: number;
  pending: number;
  recent: DraftRow[];
};

export async function getDraftsOverview(): Promise<DraftsOverview> {
  const svc = createServiceClient();
  const [emails, { data }] = await Promise.all([
    emailMap(svc),
    svc
      .from('draft_replies')
      .select('id, user_id, status, subject, model, approved_at, sent_at, error, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
  ]);
  const rows = data ?? [];
  const statusMap = new Map<string, number>();
  for (const d of rows) statusMap.set(d.status, (statusMap.get(d.status) ?? 0) + 1);
  return {
    byStatus: [...statusMap.entries()].map(([status, count]) => ({ status, count })),
    sent: rows.filter((d) => d.sent_at || d.status === 'sent').length,
    errored: rows.filter((d) => d.error || d.status === 'error' || d.status === 'failed').length,
    pending: rows.filter(
      (d) => !d.sent_at && !d.error && !['sent', 'error', 'failed', 'discarded'].includes(d.status),
    ).length,
    recent: rows.map((d) => ({
      id: d.id,
      email: emails.get(d.user_id) ?? null,
      status: d.status,
      subject: d.subject,
      model: d.model,
      approvedAt: d.approved_at,
      sentAt: d.sent_at,
      error: d.error,
      createdAt: d.created_at,
    })),
  };
}

// ---------------------------------------------------------------------------
// Wave 2 — Audit & Security
// ---------------------------------------------------------------------------
export type AuditRow = {
  id: string;
  at: string;
  actorType: string;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  targetEmail: string | null;
  metadata: unknown;
};

export async function listAuditLogs(opts?: { action?: string; limit?: number }): Promise<AuditRow[]> {
  const svc = createServiceClient();
  let q = svc
    .from('audit_logs')
    .select('id, created_at, actor_type, actor_id, action, entity_type, user_id, metadata')
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 100);
  if (opts?.action) q = q.eq('action', opts.action);
  const [emails, { data }] = await Promise.all([emailMap(svc), q]);
  return (data ?? []).map((a) => ({
    id: a.id,
    at: a.created_at,
    actorType: a.actor_type,
    actorEmail: a.actor_id ? emails.get(a.actor_id) ?? null : null,
    action: a.action,
    entityType: a.entity_type,
    targetEmail: a.user_id ? emails.get(a.user_id) ?? null : null,
    metadata: a.metadata,
  }));
}

/**
 * Which sensitive secrets are configured (presence only — never the value). Pure
 * env check so the Audit tab can show key-rotation/config status at a glance.
 */
export type SecretStatus = { key: string; label: string; configured: boolean };

export function getSecretsStatus(): SecretStatus[] {
  const has = (k: string) => Boolean((process.env[k] ?? '').trim());
  return [
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase service role', configured: has('SUPABASE_SERVICE_ROLE_KEY') },
    { key: 'TOKEN_ENCRYPTION_KEY', label: 'Token encryption key', configured: has('TOKEN_ENCRYPTION_KEY') },
    { key: 'MS_GRAPH_CLIENT_SECRET', label: 'Microsoft Graph secret', configured: has('MS_GRAPH_CLIENT_SECRET') },
    { key: 'AI_API_KEY', label: 'AI provider key', configured: has('AI_API_KEY') },
    { key: 'CRON_SECRET', label: 'Cron secret', configured: has('CRON_SECRET') },
    { key: 'MS_GRAPH_WEBHOOK_URL', label: 'Graph webhook URL', configured: has('MS_GRAPH_WEBHOOK_URL') },
  ];
}
