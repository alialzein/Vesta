import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/graph/tokens';
import { fetchRecentMessages, type GraphMessage, type GraphRecipient } from '@/lib/graph/mail';
import {
  computeThreadState,
  scoreThread,
  categorizeThread,
  type ThreadMessage,
} from '@/lib/engine/threads';
import {
  classifyEmail,
  type TriageConfig,
  type TriageMode,
  type TriageRule,
  type TriageInput,
  type FlagStatus,
  type Importance,
  type InferenceClassification,
} from '@/lib/engine/triage';
import type { Database } from '@/lib/database.types';

/**
 * Outlook email sync (Phase 4) + thread/follow-up engine (Phase 6) + triage
 * (Phase 6.5). Server-only.
 *
 * Pulls recent Inbox + Sent via Graph (only messages newer than the last sync —
 * "only new") and upserts into the Phase 1 tables idempotently. Each inbound
 * message is run through the triage engine (lib/engine/triage.ts); noise
 * (automated/bulk senders, "Other", muted) is stored but marked excluded so the
 * manager can review it, while only VISIBLE mail feeds threads + work_items.
 * Phase 6 computes each visible thread's waiting/follow-up state and creates
 * work_items for threads waiting on the manager. AI refines priority later
 * (Phase 7).
 */

const INBOX_COUNT = 50;
const SENT_COUNT = 25;

type MessageRow = Database['public']['Tables']['email_messages']['Insert'];
type ThreadRow = Database['public']['Tables']['email_threads']['Insert'];
type PersonRow = Database['public']['Tables']['people']['Insert'];
type WorkItemRow = Database['public']['Tables']['work_items']['Insert'];

type SyncContext = { userId: string; integrationId: string; mailboxId: string };
type Tagged = { msg: GraphMessage; direction: 'inbound' | 'outbound' };

export type SyncResult = {
  ok: boolean;
  inbox: number;
  sent: number;
  threads: number;
  people: number;
  workItems: number;
  /** Inbound messages hidden by triage this sync (kept for review). */
  hidden: number;
  error?: string;
};

// ---------------------------------------------------------------------------
// Pure builders (no DB) — unit tested.
// ---------------------------------------------------------------------------

function addr(r?: GraphRecipient): { name?: string; email?: string } {
  return { name: r?.emailAddress?.name, email: r?.emailAddress?.address?.toLowerCase() };
}

function domainOf(email?: string): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1) : null;
}

function recipientsJson(list?: GraphRecipient[]): { name?: string; email?: string }[] {
  return (list ?? []).map(addr).filter((a) => a.email);
}

function whenOf(msg: GraphMessage, direction: 'inbound' | 'outbound'): string | null {
  return direction === 'inbound'
    ? (msg.receivedDateTime ?? msg.sentDateTime ?? null)
    : (msg.sentDateTime ?? msg.receivedDateTime ?? null);
}

function normalizeSubject(subject?: string): string | null {
  return (subject ?? '').replace(/^(re|fwd?):\s*/i, '').trim() || null;
}

/** Map a Graph message to an email_messages row. */
export function toEmailMessageRow(
  msg: GraphMessage,
  direction: 'inbound' | 'outbound',
  ctx: SyncContext,
): MessageRow {
  const from = addr(msg.from ?? msg.sender);
  return {
    user_id: ctx.userId,
    integration_id: ctx.integrationId,
    mailbox_id: ctx.mailboxId,
    graph_message_id: msg.id,
    graph_conversation_id: msg.conversationId ?? null,
    internet_message_id: msg.internetMessageId ?? null,
    conversation_index: msg.conversationIndex ?? null,
    direction,
    subject: msg.subject ?? null,
    body_preview: msg.bodyPreview ?? null,
    sender_name: from.name ?? null,
    sender_email: from.email ?? null,
    from_email: from.email ?? null,
    to_recipients: recipientsJson(msg.toRecipients),
    cc_recipients: recipientsJson(msg.ccRecipients),
    importance: msg.importance ?? null,
    is_read: msg.isRead ?? null,
    has_attachments: msg.hasAttachments ?? false,
    categories: msg.categories ?? [],
    flag: msg.flag ?? null,
    web_link: msg.webLink ?? null,
    received_at: msg.receivedDateTime ?? null,
    sent_at: msg.sentDateTime ?? null,
  };
}

/** Group tagged messages by conversation id. */
function groupByConversation(tagged: Tagged[]): Map<string, Tagged[]> {
  const byConv = new Map<string, Tagged[]>();
  for (const t of tagged) {
    const convId = t.msg.conversationId;
    if (!convId) continue;
    const arr = byConv.get(convId);
    if (arr) arr.push(t);
    else byConv.set(convId, [t]);
  }
  return byConv;
}

/** Build one email_threads row per conversation, including follow-up flags. */
export function buildThreadRows(tagged: Tagged[], ctx: SyncContext): ThreadRow[] {
  const rows: ThreadRow[] = [];
  for (const [convId, msgs] of groupByConversation(tagged)) {
    const state = computeThreadState(
      msgs.map<ThreadMessage>(({ msg, direction }) => ({ direction, at: whenOf(msg, direction) })),
    );
    const subjectSource = msgs.find((t) => t.msg.subject)?.msg.subject;
    rows.push({
      user_id: ctx.userId,
      integration_id: ctx.integrationId,
      mailbox_id: ctx.mailboxId,
      graph_conversation_id: convId,
      subject_normalized: normalizeSubject(subjectSource),
      latest_message_at: state.latestAt,
      latest_inbound_at: state.latestInboundAt,
      latest_outbound_at: state.latestOutboundAt,
      inbound_after_last_outbound_count: state.inboundAfterLastOutboundCount,
      followup_count: state.followupCount,
      is_waiting_on_manager: state.isWaitingOnManager,
      is_waiting_on_other: state.isWaitingOnOther,
    });
  }
  return rows;
}

/** Extract unique people (by lowercased email) from senders/recipients. */
export function buildPeopleRows(messages: GraphMessage[], userId: string): PersonRow[] {
  const byEmail = new Map<string, PersonRow>();
  const consider = (r?: GraphRecipient) => {
    const a = addr(r);
    if (!a.email || byEmail.has(a.email)) return;
    byEmail.set(a.email, {
      user_id: userId,
      email: a.email,
      display_name: a.name ?? null,
      domain: domainOf(a.email),
    });
  };
  for (const msg of messages) {
    consider(msg.from ?? msg.sender);
    (msg.toRecipients ?? []).forEach(consider);
    (msg.ccRecipients ?? []).forEach(consider);
  }
  return [...byEmail.values()];
}

export type WorkItemDraft = { conversationId: string; row: WorkItemRow };

/**
 * Build work_item drafts for conversations that are waiting on the manager
 * (the actionable "needs your reply" set). Pure; thread_id is attached later.
 */
export function buildWorkItemDrafts(
  tagged: Tagged[],
  ctx: SyncContext,
  now = Date.now(),
): WorkItemDraft[] {
  const drafts: WorkItemDraft[] = [];
  for (const [convId, msgs] of groupByConversation(tagged)) {
    const state = computeThreadState(
      msgs.map<ThreadMessage>(({ msg, direction }) => ({ direction, at: whenOf(msg, direction) })),
    );
    if (!state.isWaitingOnManager) continue; // only items that need the manager

    // The latest inbound message drives title/summary/age.
    const latestInbound = msgs
      .filter((t) => t.direction === 'inbound')
      .sort((a, b) =>
        (whenOf(b.msg, 'inbound') ?? '').localeCompare(whenOf(a.msg, 'inbound') ?? ''),
      )[0]?.msg;

    const category = categorizeThread(state);
    const priority = scoreThread(state, { now });
    const followNote =
      state.followupCount > 0 ? ` They have followed up ${state.followupCount + 1} times.` : '';

    drafts.push({
      conversationId: convId,
      row: {
        user_id: ctx.userId,
        integration_id: ctx.integrationId,
        mailbox_id: ctx.mailboxId,
        source: 'outlook',
        source_external_id: convId,
        title: normalizeSubject(latestInbound?.subject) ?? '(no subject)',
        summary: latestInbound?.bodyPreview ?? null,
        category,
        status: 'open',
        priority_score: priority,
        requires_reply: true,
        urgency_reason: `${latestInbound?.from?.emailAddress?.name ?? 'Someone'} is waiting on your reply.${followNote}`,
        due_at: null,
      },
    });
  }
  return drafts;
}

// ---------------------------------------------------------------------------
// Triage (Phase 6.5) — pure mapping + partition; unit tested.
// ---------------------------------------------------------------------------

/** Map a Graph message to the triage engine's input. */
export function toTriageInput(msg: GraphMessage): TriageInput {
  const from = msg.from ?? msg.sender;
  return {
    fromEmail: from?.emailAddress?.address?.toLowerCase() ?? null,
    fromName: from?.emailAddress?.name ?? null,
    subject: msg.subject ?? null,
    inferenceClassification: (msg.inferenceClassification as InferenceClassification) ?? null,
    flagStatus: (msg.flag?.flagStatus as FlagStatus) ?? null,
    importance: (msg.importance as Importance) ?? null,
  };
}

export type Classified = {
  tagged: Tagged;
  include: boolean;
  reason: string;
  signals: string[];
  matchedRule?: string;
};

/**
 * Classify each message. Outbound (the manager's own replies) is always kept —
 * it is needed to compute thread state and must never be hidden. Inbound runs
 * through the triage engine.
 */
export function classifyForSync(tagged: Tagged[], config: TriageConfig): Classified[] {
  return tagged.map((t) => {
    if (t.direction === 'outbound') {
      return { tagged: t, include: true, reason: 'Sent by you', signals: ['outbound'] };
    }
    const d = classifyEmail(toTriageInput(t.msg), config);
    return {
      tagged: t,
      include: d.include,
      reason: d.reason,
      signals: d.signals,
      matchedRule: d.matchedRule,
    };
  });
}

type ManagerRuleRow = Pick<
  Database['public']['Tables']['manager_rules']['Row'],
  'rule_type' | 'conditions' | 'is_enabled'
>;

/** Turn enabled manager_rules (suppression/allow) into triage rules. */
export function buildTriageRules(rows: ManagerRuleRow[]): TriageRule[] {
  const rules: TriageRule[] = [];
  for (const r of rows) {
    if (!r.is_enabled) continue;
    const kind = r.rule_type === 'suppression' ? 'mute' : r.rule_type === 'allow' ? 'allow' : null;
    if (!kind) continue;
    const c = (r.conditions ?? {}) as unknown as { match?: string; value?: string };
    const match = c.match === 'domain' || c.match === 'subject' ? c.match : 'sender';
    if (!c.value) continue;
    if (kind === 'allow' && match === 'subject') continue; // allow only by sender/domain
    rules.push({ kind, match, value: String(c.value) });
  }
  return rules;
}

// ---------------------------------------------------------------------------
// Orchestrator (DB) — writes own rows via the authenticated client (RLS).
// ---------------------------------------------------------------------------

export async function syncOutlookForUser(userId: string): Promise<SyncResult> {
  const empty: SyncResult = {
    ok: false,
    inbox: 0,
    sent: 0,
    threads: 0,
    people: 0,
    workItems: 0,
    hidden: 0,
  };
  const supabase = createClient();

  const { data: mailbox } = await supabase
    .from('mailboxes')
    .select('id, integration_id, triage_mode')
    .eq('provider', 'microsoft')
    .eq('status', 'active')
    .maybeSingle();
  if (!mailbox?.integration_id) {
    return { ...empty, error: 'No connected Outlook mailbox. Connect one in Settings.' };
  }

  const token = await getValidAccessToken(mailbox.integration_id);
  if (!token) {
    return { ...empty, error: 'Outlook token unavailable — try reconnecting in Settings.' };
  }

  const ctx: SyncContext = { userId, integrationId: mailbox.integration_id, mailboxId: mailbox.id };

  // Triage config: mailbox mode + the manager's rules + VIP people. And the last
  // sync time, so we only fetch new mail.
  const [{ data: ruleRows }, { data: vipRows }, { data: cursor }] = await Promise.all([
    supabase
      .from('manager_rules')
      .select('rule_type, conditions, is_enabled')
      .eq('user_id', userId),
    supabase.from('people').select('email').eq('user_id', userId).eq('is_vip', true),
    supabase
      .from('sync_cursors')
      .select('last_success_at')
      .eq('mailbox_id', ctx.mailboxId)
      .eq('resource_type', 'messages')
      .eq('resource_id', 'all')
      .maybeSingle(),
  ]);

  const triageConfig: TriageConfig = {
    mode: (mailbox.triage_mode as TriageMode) ?? 'focused',
    rules: buildTriageRules(ruleRows ?? []),
    vipEmails: (vipRows ?? [])
      .map((p) => p.email?.toLowerCase())
      .filter((e): e is string => Boolean(e)),
  };

  // Incremental: only fetch messages newer than the last successful sync (minus a
  // 10-minute overlap so the boundary isn't missed; idempotent upserts dedupe).
  const since = cursor?.last_success_at
    ? new Date(new Date(cursor.last_success_at).getTime() - 10 * 60_000).toISOString()
    : null;

  let inbox: GraphMessage[] = [];
  let sent: GraphMessage[] = [];
  try {
    [inbox, sent] = await Promise.all([
      fetchRecentMessages(token, 'inbox', INBOX_COUNT, since),
      fetchRecentMessages(token, 'sentitems', SENT_COUNT, since),
    ]);
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : 'Graph fetch failed.' };
  }

  const tagged: Tagged[] = [
    ...inbox.map((msg) => ({ msg, direction: 'inbound' as const })),
    ...sent.map((msg) => ({ msg, direction: 'outbound' as const })),
  ];

  // Triage: classify every message. Only VISIBLE mail feeds threads/work_items;
  // hidden mail is still stored (marked excluded) so the manager can review it.
  const classified = classifyForSync(tagged, triageConfig);
  const visible = classified.filter((c) => c.include).map((c) => c.tagged);
  const hidden = classified.filter((c) => !c.include).length;

  // 1) Threads (visible only), with follow-up flags. Map conversationId -> id.
  const threadRows = buildThreadRows(visible, ctx);
  const convToThreadId = new Map<string, string>();
  if (threadRows.length > 0) {
    const { data: threads, error } = await supabase
      .from('email_threads')
      .upsert(threadRows, { onConflict: 'mailbox_id,graph_conversation_id' })
      .select('id, graph_conversation_id');
    if (error) return { ...empty, error: `Saving threads failed: ${error.message}` };
    for (const t of threads ?? []) {
      if (t.graph_conversation_id) convToThreadId.set(t.graph_conversation_id, t.id);
    }
  }

  // 2) Messages — store ALL, marking hidden ones excluded (with the reason).
  const nowIso = new Date().toISOString();
  const messageRows = classified.map(({ tagged: { msg, direction }, include, reason, signals }) => {
    const row = toEmailMessageRow(msg, direction, ctx);
    row.thread_id = msg.conversationId ? (convToThreadId.get(msg.conversationId) ?? null) : null;
    row.excluded_at = include ? null : nowIso;
    row.excluded_reason = include ? null : reason;
    row.triage = { mode: triageConfig.mode, include, reason, signals };
    return row;
  });
  if (messageRows.length > 0) {
    const { error } = await supabase
      .from('email_messages')
      .upsert(messageRows, { onConflict: 'mailbox_id,graph_message_id' });
    if (error) return { ...empty, error: `Saving messages failed: ${error.message}` };
  }

  // 3) People (from visible mail only — don't add automated/bulk senders).
  const peopleRows = buildPeopleRows(
    visible.map((t) => t.msg),
    userId,
  );
  if (peopleRows.length > 0) {
    const { error } = await supabase
      .from('people')
      .upsert(peopleRows, { onConflict: 'user_id,email', ignoreDuplicates: true });
    if (error) return { ...empty, error: `Saving people failed: ${error.message}` };
  }

  // 4) Work items for "waiting on you" threads (visible only). No unique
  // constraint exists for upsert, so dedup in code by (source_external_id).
  const drafts = buildWorkItemDrafts(visible, ctx);
  let workItems = 0;
  if (drafts.length > 0) {
    const { data: existing } = await supabase
      .from('work_items')
      .select('id, source_external_id')
      .eq('mailbox_id', ctx.mailboxId)
      .eq('source', 'outlook');
    const idByExternal = new Map<string, string>();
    for (const w of existing ?? []) {
      if (w.source_external_id) idByExternal.set(w.source_external_id, w.id);
    }

    const inserts: WorkItemRow[] = [];
    for (const { conversationId, row } of drafts) {
      row.thread_id = convToThreadId.get(conversationId) ?? null;
      const id = idByExternal.get(conversationId);
      if (id) {
        // Update the changing fields; preserve the row id + any later AI fields.
        await supabase
          .from('work_items')
          .update({
            title: row.title,
            summary: row.summary,
            category: row.category,
            priority_score: row.priority_score,
            requires_reply: row.requires_reply,
            urgency_reason: row.urgency_reason,
            thread_id: row.thread_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);
      } else {
        inserts.push(row);
      }
    }
    if (inserts.length > 0) {
      const { error } = await supabase.from('work_items').insert(inserts);
      if (error) return { ...empty, error: `Saving work items failed: ${error.message}` };
    }
    workItems = drafts.length;
  }

  // 5) Record the sync cursor (constant resource_id so the unique dedupes).
  await supabase.from('sync_cursors').upsert(
    {
      user_id: userId,
      integration_id: ctx.integrationId,
      mailbox_id: ctx.mailboxId,
      resource_type: 'messages',
      resource_id: 'all',
      last_success_at: new Date().toISOString(),
    },
    { onConflict: 'mailbox_id,resource_type,resource_id' },
  );

  return {
    ok: true,
    inbox: inbox.length,
    sent: sent.length,
    threads: threadRows.length,
    people: peopleRows.length,
    workItems,
    hidden,
  };
}
