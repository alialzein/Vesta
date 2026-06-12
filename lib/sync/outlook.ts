import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { analyzeMailboxWorkItems } from '@/lib/ai/store';
import { getValidAccessToken } from '@/lib/graph/tokens';
import {
  fetchRecentMessages,
  fetchInboxDelta,
  type GraphMessage,
  type GraphRecipient,
  type DeltaResult,
} from '@/lib/graph/mail';
import {
  computeThreadState,
  scoreThread,
  categorizeThread,
  type ThreadMessage,
  type ThreadState,
} from '@/lib/engine/threads';
import { replyLikelyExpectsResponse } from '@/lib/engine/replies';
import { type ReplyIntentMode } from '@/lib/ai/config';
import { getEffectiveReplyIntentMode } from '@/lib/ai/runtime';
import { applyScanBack, scanBackCutoffIso } from '@/lib/sync/scanback';
import { resolveRetention } from '@/lib/admin/settings';
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
import type { SupabaseClient } from '@supabase/supabase-js';

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

const SENT_COUNT = 25;

type MessageRow = Database['public']['Tables']['email_messages']['Insert'];
type ThreadRow = Database['public']['Tables']['email_threads']['Insert'];
type PersonRow = Database['public']['Tables']['people']['Insert'];
type WorkItemRow = Database['public']['Tables']['work_items']['Insert'];

type SyncContext = {
  userId: string;
  integrationId: string;
  mailboxId: string;
  /** The manager's own address(es), lowercased — to tell mail addressed to him
   *  from broadcasts he's merely Cc'd on / not listed in. */
  managerEmails?: string[];
};
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
    // Full body for the thread view. Graph returns one content type per message;
    // store HTML and plain text in their respective columns.
    body_html: msg.body?.contentType === 'html' ? (msg.body.content ?? null) : null,
    body_text: msg.body?.contentType === 'text' ? (msg.body.content ?? null) : null,
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

/** The most recent inbound message in a conversation (drives "waiting on you"). */
function latestInboundOf(msgs: Tagged[]): GraphMessage | undefined {
  return msgs
    .filter((t) => t.direction === 'inbound')
    .sort((a, b) => (whenOf(b.msg, 'inbound') ?? '').localeCompare(whenOf(a.msg, 'inbound') ?? ''))[0]
    ?.msg;
}

function latestOutboundOf(msgs: Tagged[]): GraphMessage | undefined {
  return msgs
    .filter((t) => t.direction === 'outbound')
    .sort((a, b) =>
      (whenOf(b.msg, 'outbound') ?? '').localeCompare(whenOf(a.msg, 'outbound') ?? ''),
    )[0]?.msg;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Priority for a "waiting on them" item: the longer they've gone without replying,
 *  the more it matters (the opposite of the recency boost for incoming mail). */
function scoreWaitingOnOther(state: ThreadState, now: number): number {
  let score = 30;
  if (state.latestOutboundAt) {
    const ageDays = (now - new Date(state.latestOutboundAt).getTime()) / DAY_MS;
    if (ageDays >= 5) score += 25;
    else if (ageDays >= 3) score += 18;
    else if (ageDays >= 1) score += 10;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Lowercased recipient emails from a Graph recipient list. */
function recipientEmails(list?: GraphRecipient[]): string[] {
  return (list ?? [])
    .map((r) => r.emailAddress?.address?.toLowerCase())
    .filter((e): e is string => Boolean(e));
}

/**
 * Is this inbound message actually directed at the manager — a direct To
 * recipient, or his address mentioned in the body preview — versus a broadcast
 * where he is only Cc'd or not listed at all? Prevents false "waiting on you"
 * items. When the manager's address is unknown, do not filter (return true).
 */
export function isAddressedToManager(msg: GraphMessage, managerEmails: string[]): boolean {
  const mgr = managerEmails.map((e) => e.toLowerCase()).filter(Boolean);
  if (mgr.length === 0) return true;
  if (recipientEmails(msg.toRecipients).some((e) => mgr.includes(e))) return true;
  const body = (msg.bodyPreview ?? '').toLowerCase();
  return body.length > 0 && mgr.some((m) => body.includes(m));
}

/** Build one email_threads row per conversation, including follow-up flags. */
export function buildThreadRows(tagged: Tagged[], ctx: SyncContext): ThreadRow[] {
  const rows: ThreadRow[] = [];
  for (const [convId, msgs] of groupByConversation(tagged)) {
    const state = computeThreadState(
      msgs.map<ThreadMessage>(({ msg, direction }) => ({ direction, at: whenOf(msg, direction) })),
    );
    // Only "waiting on you" if the latest inbound is actually addressed to the
    // manager (To / body-mention), not a broadcast he's merely Cc'd on.
    const latestInbound = latestInboundOf(msgs);
    const waitingOnManager =
      state.isWaitingOnManager &&
      (!latestInbound || isAddressedToManager(latestInbound, ctx.managerEmails ?? []));
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
      is_waiting_on_manager: waitingOnManager,
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
  opts: { replyIntentMode?: ReplyIntentMode; vipEmails?: string[] } = {},
): WorkItemDraft[] {
  const replyIntentMode = opts.replyIntentMode ?? 'pregate_ai';
  // VIP senders (people.is_vip) get the engine's +20 boost — previously the
  // flag only affected triage inclusion, never the priority (Phase 10 fix).
  const vips = new Set((opts.vipEmails ?? []).map((e) => e.toLowerCase()));
  const drafts: WorkItemDraft[] = [];
  for (const [convId, msgs] of groupByConversation(tagged)) {
    const state = computeThreadState(
      msgs.map<ThreadMessage>(({ msg, direction }) => ({ direction, at: whenOf(msg, direction) })),
    );

    if (!state.isWaitingOnManager) {
      // "Waiting on them": the manager replied last and may be owed a response.
      if (state.isWaitingOnOther && replyIntentMode !== 'off') {
        const latestOutbound = latestOutboundOf(msgs);
        // pregate_ai / heuristic keep only replies that plausibly ask for something;
        // ai_always keeps every reply (AI prunes the rest later).
        const keep =
          replyIntentMode === 'ai_always' ||
          replyLikelyExpectsResponse(latestOutbound?.bodyPreview ?? null);
        if (keep) {
          const other =
            latestOutbound?.toRecipients?.[0]?.emailAddress?.name ??
            latestOutbound?.toRecipients?.[0]?.emailAddress?.address ??
            'them';
          drafts.push({
            conversationId: convId,
            row: {
              user_id: ctx.userId,
              integration_id: ctx.integrationId,
              mailbox_id: ctx.mailboxId,
              source: 'outlook',
              source_external_id: convId,
              title: normalizeSubject(latestOutbound?.subject) ?? '(no subject)',
              summary: latestOutbound?.bodyPreview ?? null,
              category: 'waiting_on_them',
              status: 'open',
              priority_score: scoreWaitingOnOther(state, now),
              requires_reply: false,
              urgency_reason: `Waiting on ${other} to reply.`,
              due_at: null,
              metadata: { awaiting: 'other', reply_intent_mode: replyIntentMode },
            },
          });
        }
      }
      continue; // not waiting on the manager → no "needs your reply" item
    }

    // The latest inbound message drives title/summary/age.
    const latestInbound = latestInboundOf(msgs);
    // Skip broadcasts the manager is merely Cc'd on / not addressed in.
    if (latestInbound && !isAddressedToManager(latestInbound, ctx.managerEmails ?? [])) continue;

    const senderEmail = (latestInbound?.from ?? latestInbound?.sender)?.emailAddress?.address
      ?.trim()
      .toLowerCase();
    const category = categorizeThread(state);
    const priority = scoreThread(state, { now, isVip: !!senderEmail && vips.has(senderEmail) });
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
        // Every draft must set metadata: in a multi-row PostgREST insert the
        // column set is the UNION of all rows' keys, and rows missing a key get
        // an explicit NULL (not the column default) — which violates the
        // metadata NOT NULL constraint and fails the whole batch.
        metadata: {},
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
// Orchestrator (DB). Fetch is incremental; classification runs over STORED mail
// so changing the triage mode re-evaluates everything immediately. Own-row tables
// use the authenticated client (RLS); sync_cursors is service-write only.
// ---------------------------------------------------------------------------

// Either the authenticated client (own-rows via RLS) or the service client
// (cron/webhooks — no user session). Queries are scoped by mailbox_id/user_id,
// so the service client is safe here even though it bypasses RLS.
type DbClient = SupabaseClient<Database>;
type Mailbox = {
  id: string;
  integration_id: string;
  triage_mode: string;
  mailbox_email: string | null;
};

/** Rebuild Graph recipients from the stored jsonb ([{ name, email }]). */
function recipientsFromStored(j: unknown): GraphRecipient[] {
  if (!Array.isArray(j)) return [];
  const out: GraphRecipient[] = [];
  for (const x of j) {
    const r = (x ?? {}) as { name?: string; email?: string };
    if (r.email) out.push({ emailAddress: { name: r.name, address: r.email } });
  }
  return out;
}

/** Reconstruct the minimal Graph-shaped message the builders/classifier need. */
function storedToTagged(r: StoredMessage): Tagged {
  const triage = (r.triage ?? {}) as { inference?: InferenceClassification | null };
  const flag = (r.flag ?? null) as { flagStatus?: string } | null;
  return {
    msg: {
      id: r.graph_message_id,
      conversationId: r.graph_conversation_id ?? undefined,
      subject: r.subject ?? undefined,
      bodyPreview: r.body_preview ?? undefined,
      from: {
        emailAddress: {
          name: r.sender_name ?? undefined,
          address: r.sender_email ?? r.from_email ?? undefined,
        },
      },
      toRecipients: recipientsFromStored(r.to_recipients),
      ccRecipients: recipientsFromStored(r.cc_recipients),
      receivedDateTime: r.received_at ?? undefined,
      sentDateTime: r.sent_at ?? undefined,
      importance: r.importance ?? undefined,
      flag: flag ?? undefined,
      inferenceClassification: triage.inference ?? undefined,
    },
    direction: r.direction === 'outbound' ? 'outbound' : 'inbound',
  };
}

type StoredMessage = {
  id: string;
  graph_message_id: string;
  graph_conversation_id: string | null;
  subject: string | null;
  body_preview: string | null;
  sender_name: string | null;
  sender_email: string | null;
  from_email: string | null;
  to_recipients: unknown;
  cc_recipients: unknown;
  received_at: string | null;
  sent_at: string | null;
  importance: string | null;
  flag: unknown;
  triage: unknown;
  direction: string | null;
  excluded_at: string | null;
};

const STORED_COLS =
  'id, graph_message_id, graph_conversation_id, subject, body_preview, sender_name, sender_email, from_email, to_recipients, cc_recipients, received_at, sent_at, importance, flag, triage, direction, excluded_at';

/** Load triage config (mode + manager rules + VIP people) for a user/mailbox. */
async function loadTriageConfig(
  supabase: DbClient,
  userId: string,
  mode: string,
): Promise<TriageConfig> {
  const [{ data: ruleRows }, { data: vipRows }] = await Promise.all([
    supabase
      .from('manager_rules')
      .select('rule_type, conditions, is_enabled')
      .eq('user_id', userId),
    supabase.from('people').select('email').eq('user_id', userId).eq('is_vip', true),
  ]);
  return {
    mode: (mode as TriageMode) ?? 'focused',
    rules: buildTriageRules(ruleRows ?? []),
    vipEmails: (vipRows ?? [])
      .map((p) => p.email?.toLowerCase())
      .filter((e): e is string => Boolean(e)),
  };
}

/**
 * Classify all STORED mail with the current config, update each message's
 * excluded state, and rebuild threads + work_items from the visible set. This is
 * the single source of truth, so it runs after a fetch AND on a mode change.
 */
async function processStoredMail(
  supabase: DbClient,
  ctx: SyncContext,
  config: TriageConfig,
): Promise<{ threads: number; workItems: number; hidden: number }> {
  const { data: rows } = await supabase
    .from('email_messages')
    .select(STORED_COLS)
    .eq('mailbox_id', ctx.mailboxId)
    .is('deleted_at', null);
  const stored = (rows ?? []) as StoredMessage[];
  if (stored.length === 0) return { threads: 0, workItems: 0, hidden: 0 };

  const rowByMsgId = new Map(stored.map((r) => [r.graph_message_id, r]));
  const classified = classifyForSync(stored.map(storedToTagged), config);
  const visible = classified.filter((c) => c.include).map((c) => c.tagged);
  const hidden = classified.filter((c) => !c.include).length;

  // Threads (visible only) -> conversation id => thread id.
  const threadRows = buildThreadRows(visible, ctx);
  const convToThreadId = new Map<string, string>();
  if (threadRows.length > 0) {
    const { data: threads } = await supabase
      .from('email_threads')
      .upsert(threadRows, { onConflict: 'mailbox_id,graph_conversation_id' })
      .select('id, graph_conversation_id');
    for (const t of threads ?? []) {
      if (t.graph_conversation_id) convToThreadId.set(t.graph_conversation_id, t.id);
    }
  }

  // Update each message's excluded state + thread link, only when it changed.
  // Writes run in parallel — sequential awaits to the cloud DB are the main
  // source of latency on a mode/rule change.
  const nowIso = new Date().toISOString();
  const messageUpdates: PromiseLike<unknown>[] = [];
  for (const c of classified) {
    const r = rowByMsgId.get(c.tagged.msg.id);
    if (!r) continue;
    const prev = (r.triage ?? {}) as {
      reason?: string;
      inference?: InferenceClassification | null;
    };
    const wasExcluded = r.excluded_at != null;
    const nowExcluded = !c.include;
    const threadId = c.tagged.msg.conversationId
      ? (convToThreadId.get(c.tagged.msg.conversationId) ?? null)
      : null;
    if (wasExcluded === nowExcluded && prev.reason === c.reason) continue; // no-op
    messageUpdates.push(
      supabase
        .from('email_messages')
        .update({
          excluded_at: nowExcluded ? (r.excluded_at ?? nowIso) : null,
          excluded_reason: nowExcluded ? c.reason : null,
          thread_id: threadId,
          triage: {
            mode: config.mode,
            include: c.include,
            reason: c.reason,
            signals: c.signals,
            inference: prev.inference ?? null,
          },
        })
        .eq('id', r.id),
    );
  }
  if (messageUpdates.length > 0) await Promise.all(messageUpdates);

  // People (from visible mail only).
  const peopleRows = buildPeopleRows(
    visible.map((t) => t.msg),
    ctx.userId,
  );
  if (peopleRows.length > 0) {
    await supabase
      .from('people')
      .upsert(peopleRows, { onConflict: 'user_id,email', ignoreDuplicates: true });
  }

  // Work items: threads waiting on the manager + (mode-gated) threads where the
  // manager replied and is owed a response. Delete any that no longer apply.
  // Mode is the EFFECTIVE one (admin per-user → global → env) so the panel's
  // reply-intent setting gates the engine too, not just the AI confirm step.
  const drafts = buildWorkItemDrafts(visible, ctx, Date.now(), {
    replyIntentMode: await getEffectiveReplyIntentMode(ctx.userId),
    vipEmails: config.vipEmails,
  });
  const wantedIds = new Set(drafts.map((d) => d.conversationId));
  const { data: existing } = await supabase
    .from('work_items')
    .select('id, source_external_id, last_analyzed_at, status, metadata, category')
    .eq('mailbox_id', ctx.mailboxId)
    .eq('source', 'outlook');
  const idByExternal = new Map<string, string>();
  // Items AI has already analyzed: the engine must NOT clobber their AI-owned
  // display fields (category/priority/summary/reason) on a later no-op sync, or the
  // AI result is silently reverted. (When a thread changes, AI re-runs this sync and
  // refreshes them anyway.)
  const aiOwned = new Set<string>();
  // Status + dismissal time, so a dismissed thread can resurface when the person
  // replies again (dismiss = "handled for now", not a permanent mute).
  const statusByExternal = new Map<string, string | null>();
  const resolvedAtByExternal = new Map<string, string>();
  // Prior category, so we can detect a change in WHO is waiting (see below).
  const categoryByExternal = new Map<string, string | null>();
  const staleIds: string[] = [];
  for (const w of existing ?? []) {
    if (!w.source_external_id) continue;
    idByExternal.set(w.source_external_id, w.id);
    if (w.last_analyzed_at) aiOwned.add(w.id);
    statusByExternal.set(w.source_external_id, w.status ?? null);
    categoryByExternal.set(w.source_external_id, w.category ?? null);
    const resolvedAt = (w.metadata as { resolved_at?: string } | null)?.resolved_at;
    if (resolvedAt) resolvedAtByExternal.set(w.source_external_id, resolvedAt);
    if (!wantedIds.has(w.source_external_id)) staleIds.push(w.id);
  }
  // Latest inbound time per conversation (from the thread rows just built) — used
  // to tell whether a dismissed thread has new activity since it was dismissed.
  const latestInboundByConv = new Map<string, string | null>();
  for (const t of threadRows) {
    if (t.graph_conversation_id)
      latestInboundByConv.set(t.graph_conversation_id, t.latest_inbound_at ?? null);
  }
  if (staleIds.length > 0) {
    await supabase.from('work_items').delete().in('id', staleIds);
  }

  // Sweep legacy orphans: older syncs created some outlook work_items without a
  // mailbox_id, so the per-mailbox stale check above can never see them and a
  // deleted source email strands them on the dashboard forever. Every current
  // draft sets mailbox_id, so any null-mailbox outlook work_item for this user is
  // such an orphan — safe to remove.
  await supabase
    .from('work_items')
    .delete()
    .eq('user_id', ctx.userId)
    .eq('source', 'outlook')
    .is('mailbox_id', null);

  const inserts: WorkItemRow[] = [];
  const workItemUpdates: PromiseLike<unknown>[] = [];
  for (const { conversationId, row } of drafts) {
    row.thread_id = convToThreadId.get(conversationId) ?? null;
    const id = idByExternal.get(conversationId);
    if (id) {
      // Engine-owned fields are always refreshed. AI-owned display fields are only
      // (re)written by the engine while the item is NOT yet AI-analyzed — once AI
      // owns them, leave them to AI so a no-op sync can't revert the AI result.
      const update: Database['public']['Tables']['work_items']['Update'] = {
        title: row.title,
        requires_reply: row.requires_reply,
        thread_id: row.thread_id,
        updated_at: nowIso,
      };
      if (!aiOwned.has(id)) {
        update.summary = row.summary;
        update.category = row.category;
        update.priority_score = row.priority_score;
        update.urgency_reason = row.urgency_reason;
      } else if (
        row.category === 'waiting_on_them' &&
        categoryByExternal.get(conversationId) === 'waiting_on_them'
      ) {
        // The aging score of "waiting on them" is ENGINE-owned even after AI ran:
        // reply-intent confirms/summarizes but never writes a priority, so without
        // this the score froze at creation time instead of climbing as they stall.
        update.priority_score = row.priority_score;
      }
      // A change in WHO is waiting — into or out of "waiting on them" — is an engine
      // fact (the manager replied, or the other party replied) that the AI must NOT
      // pin over. Force the engine fields and re-queue for AI, even when AI-owned;
      // otherwise an item the manager already answered stays stuck as "waiting on you".
      const prevCategory = categoryByExternal.get(conversationId);
      const directionFlipped =
        (prevCategory === 'waiting_on_them') !== (row.category === 'waiting_on_them');
      if (directionFlipped) {
        update.summary = row.summary;
        update.category = row.category;
        update.priority_score = row.priority_score;
        update.urgency_reason = row.urgency_reason;
        update.suggested_action = null;
        update.last_analyzed_at = null; // let AI re-analyze the new state next pass
      }
      // Resurface a cleared thread (done OR dismissed) when a newer inbound message
      // has arrived since the manager cleared it — new activity on a thread you
      // closed needs you again. Snoozed is left to its timer.
      const prevStatus = statusByExternal.get(conversationId);
      if (prevStatus === 'dismissed' || prevStatus === 'done') {
        const resolvedAt = resolvedAtByExternal.get(conversationId);
        const latestInboundAt = latestInboundByConv.get(conversationId);
        if (resolvedAt && latestInboundAt && latestInboundAt > resolvedAt) {
          update.status = 'open';
          update.completed_at = null;
          // Adopt the current engine category: e.g. an AI-dismissed "waiting on them"
          // item is now "waiting on you" because the recipient finally replied.
          update.category = row.category;
        }
      }
      workItemUpdates.push(supabase.from('work_items').update(update).eq('id', id));
    } else {
      inserts.push(row);
    }
  }
  if (inserts.length > 0) workItemUpdates.push(supabase.from('work_items').insert(inserts));
  if (workItemUpdates.length > 0) {
    // PostgREST write failures resolve with { error } instead of throwing, so a
    // failed insert/update would otherwise vanish without a trace (this hid a
    // NOT NULL violation that emptied the radar after an Outlook reconnect).
    const results = await Promise.all(workItemUpdates);
    for (const r of results) {
      const err = (r as { error?: { message?: string; code?: string } | null }).error;
      if (err) console.error(`[sync] work_items write failed (${err.code}): ${err.message}`);
    }
  }

  return { threads: threadRows.length, workItems: drafts.length, hidden };
}

/** The manager's own address(es) for a mailbox (lowercased) — used to tell mail
 *  addressed to them from broadcasts they're merely on. */
function managerEmailsOf(mailboxEmail: string | null | undefined): string[] {
  return mailboxEmail ? [mailboxEmail.toLowerCase()] : [];
}

/** Find the user's active Microsoft mailbox, or return an error message. */
async function getActiveMailbox(
  supabase: DbClient,
): Promise<{ mailbox?: Mailbox; error?: string }> {
  const { data } = await supabase
    .from('mailboxes')
    .select('id, integration_id, triage_mode, mailbox_email')
    .eq('provider', 'microsoft')
    .eq('status', 'active')
    .maybeSingle();
  if (!data?.integration_id) {
    return { error: 'No connected Outlook mailbox. Connect one in Settings.' };
  }
  return { mailbox: data as Mailbox };
}

const EMPTY_RESULT: SyncResult = {
  ok: false,
  inbox: 0,
  sent: 0,
  threads: 0,
  people: 0,
  workItems: 0,
  hidden: 0,
};

/**
 * Sync one mailbox given its context. Works with either the authenticated client
 * (own-rows via RLS) or the service client (cron/webhooks — no user session); the
 * caller chooses. The cursor + last_sync_at stamps are always service-written.
 */
async function runMailboxSync(
  db: DbClient,
  service: DbClient,
  ctx: SyncContext,
  triageMode: string,
): Promise<SyncResult> {
  const token = await getValidAccessToken(ctx.integrationId);
  if (!token) {
    return { ...EMPTY_RESULT, error: 'Outlook token unavailable — try reconnecting in Settings.' };
  }
  const config = await loadTriageConfig(db, ctx.userId, triageMode);

  // Incremental: only fetch mail newer than the last successful sync (minus a
  // 10-minute overlap; idempotent upserts dedupe). Cursor is service-write only.
  const { data: cursor } = await service
    .from('sync_cursors')
    .select('last_success_at, delta_link, next_link')
    .eq('mailbox_id', ctx.mailboxId)
    .eq('resource_type', 'messages')
    .eq('resource_id', 'all')
    .maybeSingle();
  // Inbox uses Graph delta (catches new/updated AND deletes); resume a large
  // initial sync from next_link, else continue from the stored delta_link.
  const inboxCursor = cursor?.next_link ?? cursor?.delta_link ?? null;
  // Sent stays timestamp-incremental (its deletes don't affect thread state).
  const since = cursor?.last_success_at
    ? new Date(new Date(cursor.last_success_at).getTime() - 10 * 60_000).toISOString()
    : null;

  let delta: DeltaResult = { messages: [], removedIds: [], deltaLink: null, nextLink: null };
  let sent: GraphMessage[] = [];
  try {
    [delta, sent] = await Promise.all([
      fetchInboxDelta(token, inboxCursor),
      fetchRecentMessages(token, 'sentitems', SENT_COUNT, since),
    ]);
  } catch (e) {
    return { ...EMPTY_RESULT, error: e instanceof Error ? e.message : 'Graph fetch failed.' };
  }

  // Initial-import window (admin setting, default 7 days): while the FIRST
  // enumeration of this mailbox is still running (no delta_link yet), skip
  // messages older than the scan-back cutoff so a huge history isn't imported.
  // Steady-state delta runs only carry new changes and are never filtered.
  let scanCutoffIso: string | null = null;
  if (!cursor?.delta_link) {
    try {
      const { scanBackDays } = await resolveRetention(ctx.userId);
      scanCutoffIso = scanBackCutoffIso(scanBackDays);
    } catch {
      /* settings unavailable — import unfiltered, as before */
    }
  }
  const inbox = applyScanBack(delta.messages, scanCutoffIso);
  sent = applyScanBack(sent, scanCutoffIso);

  // Soft-delete messages Graph reported removed, so they drop out of threads,
  // work_items, and the Inbox/Hidden views on this and future runs.
  if (delta.removedIds.length > 0) {
    await db
      .from('email_messages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('mailbox_id', ctx.mailboxId)
      .in('graph_message_id', delta.removedIds);
  }

  // Store the raw new messages (triage decided in processStoredMail). Keep the
  // raw Graph inference signal in `triage.inference` for later re-classification.
  const tagged: Tagged[] = [
    ...inbox.map((msg) => ({ msg, direction: 'inbound' as const })),
    ...sent.map((msg) => ({ msg, direction: 'outbound' as const })),
  ];
  const messageRows = tagged.map(({ msg, direction }) => {
    const row = toEmailMessageRow(msg, direction, ctx);
    row.triage = { inference: msg.inferenceClassification ?? null };
    return row;
  });
  if (messageRows.length > 0) {
    const { error } = await db
      .from('email_messages')
      .upsert(messageRows, { onConflict: 'mailbox_id,graph_message_id', ignoreDuplicates: true });
    if (error) return { ...EMPTY_RESULT, error: `Saving messages failed: ${error.message}` };
  }

  // The insert-only upsert above (ON CONFLICT DO NOTHING) can't apply delta's whole
  // reason for existing: a message we already store may come back because its flag,
  // read state, or importance CHANGED in Outlook. Land those volatile Graph-owned
  // fields here so re-classification (e.g. a newly flagged message in "flagged" mode)
  // actually sees the new flag. We deliberately leave `triage` (holds the persisted
  // inference signal) and `excluded_at` to processStoredMail.
  const volatileUpdates = inbox.map((msg) =>
    db
      .from('email_messages')
      .update({
        flag: msg.flag ?? null,
        is_read: msg.isRead ?? null,
        importance: msg.importance ?? null,
        categories: msg.categories ?? [],
      })
      .eq('mailbox_id', ctx.mailboxId)
      .eq('graph_message_id', msg.id),
  );
  if (volatileUpdates.length > 0) await Promise.all(volatileUpdates);

  const { threads, workItems, hidden } = await processStoredMail(db, ctx, config);

  // Record the sync cursor + stamp last_sync_at on the integration/mailbox via the
  // service role (sync_cursors is service-write; the stamps keep those rows honest
  // for status surfaces). All three share one timestamp for consistency.
  const syncedAt = new Date().toISOString();
  await Promise.all([
    service.from('sync_cursors').upsert(
      {
        user_id: ctx.userId,
        integration_id: ctx.integrationId,
        mailbox_id: ctx.mailboxId,
        resource_type: 'messages',
        resource_id: 'all',
        last_success_at: syncedAt,
        delta_link: delta.deltaLink ?? (delta.nextLink ? null : (cursor?.delta_link ?? null)),
        next_link: delta.nextLink,
      },
      { onConflict: 'mailbox_id,resource_type,resource_id' },
    ),
    service.from('user_integrations').update({ last_sync_at: syncedAt }).eq('id', ctx.integrationId),
    service.from('mailboxes').update({ last_sync_at: syncedAt }).eq('id', ctx.mailboxId),
  ]);

  // Phase 7 — AI-analyze the new/changed actionable items (best-effort; never
  // breaks the sync, and no-ops when AI isn't configured).
  try {
    await analyzeMailboxWorkItems(db, { userId: ctx.userId, mailboxId: ctx.mailboxId });
  } catch {
    /* AI analysis is best-effort */
  }

  return {
    ok: true,
    inbox: inbox.length,
    sent: sent.length,
    threads,
    people: 0,
    workItems,
    hidden,
  };
}

/** Sync the signed-in user's active mailbox (authenticated path — Settings "Sync now"). */
export async function syncOutlookForUser(userId: string): Promise<SyncResult> {
  const supabase = createClient();
  const service = createServiceClient();
  const { mailbox, error } = await getActiveMailbox(supabase);
  if (!mailbox) return { ...EMPTY_RESULT, error };
  const ctx: SyncContext = {
    userId,
    integrationId: mailbox.integration_id,
    mailboxId: mailbox.id,
    managerEmails: managerEmailsOf(mailbox.mailbox_email),
  };
  return runMailboxSync(supabase, service, ctx, mailbox.triage_mode);
}

export type MailboxSyncResult = { mailboxId: string; userId: string; result: SyncResult };

/**
 * Sync ALL connected Microsoft mailboxes with the service role (no user session).
 * Used by the scheduled cron + webhook-triggered sync so mail stays fresh without
 * a browser open. Each mailbox is scoped explicitly by id/user; service-role
 * bypasses RLS but the queries are mailbox/user-scoped.
 */
export async function syncAllConnectedMailboxes(): Promise<{
  mailboxes: number;
  synced: number;
  results: MailboxSyncResult[];
}> {
  const service = createServiceClient();
  const { data: rows } = await service
    .from('mailboxes')
    .select('id, user_id, integration_id, triage_mode, mailbox_email')
    .eq('provider', 'microsoft')
    .eq('status', 'active');
  const mailboxes = (rows ?? []) as Array<{
    id: string;
    user_id: string;
    integration_id: string;
    triage_mode: string;
    mailbox_email: string | null;
  }>;
  const results: MailboxSyncResult[] = [];
  for (const mb of mailboxes) {
    const ctx: SyncContext = {
      userId: mb.user_id,
      integrationId: mb.integration_id,
      mailboxId: mb.id,
      managerEmails: managerEmailsOf(mb.mailbox_email),
    };
    const result = await runMailboxSync(service, service, ctx, mb.triage_mode);
    results.push({ mailboxId: mb.id, userId: mb.user_id, result });
  }
  return { mailboxes: mailboxes.length, synced: results.filter((r) => r.result.ok).length, results };
}

/** Sync a single mailbox by id with the service role (webhook-triggered). */
export async function syncMailboxById(mailboxId: string): Promise<SyncResult> {
  const service = createServiceClient();
  const { data: mb } = await service
    .from('mailboxes')
    .select('id, user_id, integration_id, triage_mode, status, provider, mailbox_email')
    .eq('id', mailboxId)
    .maybeSingle();
  if (!mb || mb.provider !== 'microsoft' || mb.status !== 'active') {
    return { ...EMPTY_RESULT, error: 'Mailbox not found or not active.' };
  }
  const ctx: SyncContext = {
    userId: mb.user_id,
    integrationId: mb.integration_id,
    mailboxId: mb.id,
    managerEmails: managerEmailsOf(mb.mailbox_email),
  };
  return runMailboxSync(service, service, ctx, mb.triage_mode);
}

/**
 * Re-run triage over stored mail without fetching (e.g. after the manager changes
 * the mode or a rule). Returns updated counts so the UI can reflect the change.
 */
export async function reprocessMailForUser(userId: string): Promise<SyncResult> {
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
  const { mailbox, error } = await getActiveMailbox(supabase);
  if (!mailbox) return { ...empty, error };

  const ctx: SyncContext = {
    userId,
    integrationId: mailbox.integration_id,
    mailboxId: mailbox.id,
    managerEmails: managerEmailsOf(mailbox.mailbox_email),
  };
  const config = await loadTriageConfig(supabase, userId, mailbox.triage_mode);
  const { threads, workItems, hidden } = await processStoredMail(supabase, ctx, config);
  try {
    await analyzeMailboxWorkItems(supabase, { userId: ctx.userId, mailboxId: ctx.mailboxId });
  } catch {
    /* AI analysis is best-effort */
  }
  return { ok: true, inbox: 0, sent: 0, threads, people: 0, workItems, hidden };
}
