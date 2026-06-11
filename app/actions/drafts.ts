'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { Database, Json } from '@/lib/database.types';
import type { DraftView } from '@/lib/types';
import { toDraftView, ACTIVE_DRAFT_STATUSES, type DraftRow } from '@/lib/drafts/serialize';
import {
  buildDraftPrompt,
  parseDraft,
  DRAFT_PROMPT_VERSION,
  DRAFT_TONES,
  type DraftTone,
  type DraftPurpose,
  type ThreadContextMsg,
} from '@/lib/ai/draft';
import { bodyForAi } from '@/lib/ai/context';
import { memoryNotesForDraft, type MemoryRow } from '@/lib/ai/memory';
import { estimateCostUsd } from '@/lib/ai/cost';
import { recordAiUsage } from '@/lib/ai/usage';
import { getEffectiveAi, getEffectiveSendMode } from '@/lib/ai/runtime';
import {
  buildReplyRecipients,
  buildQuotedOriginal,
  composeReplyHtml,
  detectSensitiveTopics,
  dedupeRecipients,
  isValidEmail,
  type Recipient,
} from '@/lib/email/reply';
import { getValidAccessToken, hasSendScope } from '@/lib/graph/tokens';
import { sendReply, createReplyDraft, type ReplyRecipientsInput } from '@/lib/graph/send';
import { GraphRequestError } from '@/lib/graph/client';

/**
 * Phase 9 — Draft Replies. The manager generates an AI reply, edits it, and then
 * explicitly approves it to send. Nothing here ever sends without that approval
 * (AGENTS.md "draft-first, approve-before-send"). Every send is audit-logged and,
 * on success, the work item is marked done (it resurfaces if the person replies).
 *
 * Drafts live in draft_replies (own-rows RLS via the authed client). Sending uses
 * the service-role token store + writes an immutable audit row (service-write).
 *
 * `DRAFT_SEND_MODE=draft_only` builds the reply as a real Outlook *draft* and stops
 * (the manager sends it from Outlook) — a no-send fallback that needs no Mail.Send.
 */

type DbClient = SupabaseClient<Database>;

export type DraftActionResult = {
  ok: boolean;
  error?: string;
  /** True when the mailbox needs reconnecting to grant the Mail.Send scope. */
  needsReconnect?: boolean;
  draft?: DraftView;
};

function asTone(v: string | null | undefined): DraftTone {
  return DRAFT_TONES.includes(v as DraftTone) ? (v as DraftTone) : 'professional';
}


type ActiveMailbox = { id: string; integration_id: string; mailbox_email: string | null };

/** The user's active Microsoft mailbox (RLS-scoped), or null. */
async function getActiveMailbox(db: DbClient): Promise<ActiveMailbox | null> {
  const { data } = await db
    .from('mailboxes')
    .select('id, integration_id, mailbox_email')
    .eq('provider', 'microsoft')
    .eq('status', 'active')
    .maybeSingle();
  return data?.integration_id ? (data as ActiveMailbox) : null;
}

/** Recipients → the jsonb we store + show. */
function recipientsJson(list: Recipient[]): Json {
  return list.map((r) => ({ name: r.name ?? null, email: r.email ?? null })) as unknown as Json;
}

/** A recipient as the client sends it (plain serializable object). */
export type RecipientInput = { name?: string | null; email?: string | null };

/** The stored original-message fields needed to build the quoted reply body. */
type OriginalForQuote = {
  graph_message_id: string;
  sender_name: string | null;
  sender_email: string | null;
  subject: string | null;
  received_at: string | null;
  sent_at: string | null;
  to_recipients: unknown;
  body_html: string | null;
  body_text: string | null;
  body_preview: string | null;
};

/** Keep only valid, de-duplicated email recipients from client-supplied input. */
function sanitizeRecipients(list: RecipientInput[] | undefined): Recipient[] {
  if (!Array.isArray(list)) return [];
  const valid = list
    .map((r) => ({ name: r.name ?? null, email: (r.email ?? '').trim() }))
    .filter((r) => r.email && isValidEmail(r.email));
  return dedupeRecipients(valid);
}

type ReplyItem = {
  id: string;
  title: string | null;
  category: string | null;
  source: string | null;
  source_external_id: string | null;
};
type InboundMsg = {
  id: string;
  graph_message_id: string;
  subject: string | null;
  sender_name: string | null;
  sender_email: string | null;
  to_recipients: unknown;
  cc_recipients: unknown;
  body_text: string | null;
  body_html: string | null;
  body_preview: string | null;
  direction?: string | null;
  received_at?: string | null;
};

/** How many recent thread messages (both directions) feed the draft prompt. */
const THREAD_CONTEXT_MESSAGES = 6;
/** Per-message cap inside the thread-context block (the latest inbound message
 *  is still sent in full separately). */
const THREAD_CONTEXT_CHARS = 500;

/**
 * Resolve the thread we're replying to: the work item must be an Outlook thread,
 * and it must have a latest inbound message to answer. Also returns the recent
 * messages in BOTH directions — the model needs to see the manager's own replies
 * (a 'waiting_on_them' thread looked like an unanswered chase without them).
 * Returns an error string (not throw) so callers return a clean DraftActionResult.
 */
async function loadReplyContext(
  db: DbClient,
  workItemId: string,
): Promise<{ error?: string; item?: ReplyItem; inbound?: InboundMsg; recent?: InboundMsg[] }> {
  const { data: item } = await db
    .from('work_items')
    .select('id, title, category, source, source_external_id')
    .eq('id', workItemId)
    .maybeSingle();
  if (!item) return { error: 'Work item not found.' };
  if (item.source !== 'outlook' || !item.source_external_id) {
    return { error: 'This item is not an email thread, so there is nothing to reply to.' };
  }
  const { data: msgs } = await db
    .from('email_messages')
    .select(
      'id, graph_message_id, subject, sender_name, sender_email, to_recipients, cc_recipients, body_text, body_html, body_preview, direction, received_at',
    )
    .eq('graph_conversation_id', item.source_external_id)
    .is('deleted_at', null)
    .order('received_at', { ascending: false })
    .limit(THREAD_CONTEXT_MESSAGES);
  const recent = (msgs ?? []) as InboundMsg[];
  // The reply still threads onto the latest INBOUND message (Graph reply target
  // + recipients), even when the newest message is the manager's own.
  const inbound = recent.find((m) => m.direction === 'inbound');
  if (!inbound?.graph_message_id) return { error: 'No message found to reply to in this thread.' };
  return { item: item as ReplyItem, inbound, recent };
}

/** Compact "who said what" lines (oldest first) for the draft prompt. */
function threadContextFor(recent: InboundMsg[]): ThreadContextMsg[] {
  return recent
    .slice()
    .reverse()
    .map((m) => ({
      from:
        m.direction === 'outbound'
          ? 'the manager'
          : m.sender_name || m.sender_email || 'them',
      body:
        bodyForAi({
          body_text: m.body_text,
          body_html: m.body_html,
          body_preview: m.body_preview,
        }).slice(0, THREAD_CONTEXT_CHARS) || '(no body available)',
    }));
}

/** Normalize a stored recipient list to {name,email}. */
function cleanRecipients(list: unknown): { name: string | null; email: string | null }[] {
  return ((list as Recipient[] | null) ?? []).map((r) => ({
    name: r.name ?? null,
    email: r.email ?? null,
  }));
}

/**
 * Raw participants of the message being answered + the manager's address, stored in
 * the draft metadata so the composer can re-seed To/Cc when reply-all is toggled.
 */
function inboundMeta(inbound: InboundMsg, mailboxEmail: string | null) {
  return {
    inbound: {
      from: { name: inbound.sender_name ?? null, email: inbound.sender_email ?? null },
      to: cleanRecipients(inbound.to_recipients),
      cc: cleanRecipients(inbound.cc_recipients),
    },
    manager_email: mailboxEmail ?? null,
  };
}

/** Reply recipients (mirrors Outlook Reply/Reply All) for display + storage. */
function replyRecipientsFor(inbound: InboundMsg, mailboxEmail: string | null, replyAll: boolean) {
  return buildReplyRecipients(
    {
      from: { name: inbound.sender_name, email: inbound.sender_email },
      to: (inbound.to_recipients as Recipient[] | null) ?? [],
      cc: (inbound.cc_recipients as Recipient[] | null) ?? [],
    },
    mailboxEmail ? [mailboxEmail] : [],
    { replyAll },
  );
}

/** Upsert the single active draft for a work item (update existing, else insert). */
async function upsertActiveDraft(
  db: DbClient,
  workItemId: string,
  row: Database['public']['Tables']['draft_replies']['Insert'],
): Promise<{ error?: string; draft?: DraftRow }> {
  const { data: existing } = await db
    .from('draft_replies')
    .select('id')
    .eq('work_item_id', workItemId)
    .in('status', [...ACTIVE_DRAFT_STATUSES])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) {
    const { data, error } = await db
      .from('draft_replies')
      .update(row)
      .eq('id', existing.id)
      .select('*')
      .single();
    return error ? { error: error.message } : { draft: data as DraftRow };
  }
  const { data, error } = await db.from('draft_replies').insert(row).select('*').single();
  return error ? { error: error.message } : { draft: data as DraftRow };
}

/**
 * Create (or return) an empty draft for a work item — the manual-compose path used
 * when AI is off or the manager wants to write from scratch. No AI call. Gives the
 * composer a real draft row (with resolved recipients + the message to reply to) to
 * save and send against.
 */
export async function ensureBlankDraft(
  workItemId: string,
  opts?: { replyAll?: boolean },
): Promise<DraftActionResult> {
  const user = await requireUser();
  const db = createClient();

  const existing = await loadDraftForItem(workItemId);
  if (existing) return { ok: true, draft: existing };

  const ctx = await loadReplyContext(db, workItemId);
  if (ctx.error || !ctx.inbound || !ctx.item) return { ok: false, error: ctx.error ?? 'Cannot reply.' };

  const mailbox = await getActiveMailbox(db);
  const replyAll = opts?.replyAll === true;
  const recipients = replyRecipientsFor(ctx.inbound, mailbox?.mailbox_email ?? null, replyAll);
  const sensitiveTopics = detectSensitiveTopics(
    bodyForAi({
      body_text: ctx.inbound.body_text,
      body_html: ctx.inbound.body_html,
      body_preview: ctx.inbound.body_preview,
    }),
  );

  const res = await upsertActiveDraft(db, workItemId, {
    user_id: user.id,
    work_item_id: workItemId,
    email_message_id: ctx.inbound.id,
    status: 'draft',
    subject: ctx.inbound.subject ?? ctx.item.title ?? '(no subject)',
    body_text: '',
    to_recipients: recipientsJson(recipients.to),
    cc_recipients: recipientsJson(recipients.cc),
    metadata: {
      requires_human_review: sensitiveTopics.length > 0,
      sensitive_topics: sensitiveTopics,
      reply_all: replyAll,
      bcc: [],
      ...inboundMeta(ctx.inbound, mailbox?.mailbox_email ?? null),
    } as unknown as Json,
  });
  if (res.error || !res.draft) return { ok: false, error: res.error ?? 'Could not start a draft.' };
  return { ok: true, draft: toDraftView(res.draft) };
}

/**
 * Load the current (non-terminal) draft for a work item, if any — so re-opening
 * the composer shows what was already generated/edited rather than starting blank.
 */
export async function loadDraftForItem(workItemId: string): Promise<DraftView | null> {
  await requireUser();
  const db = createClient();
  const { data } = await db
    .from('draft_replies')
    .select('*')
    .eq('work_item_id', workItemId)
    .in('status', [...ACTIVE_DRAFT_STATUSES])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? toDraftView(data as DraftRow) : null;
}

/**
 * Generate (or regenerate) an AI draft reply for a work item. Reads only the
 * latest inbound message + compact thread facts + the manager's tone preferences
 * (data minimization, AGENTS.md). Stores one active draft per item.
 */
export async function generateDraft(
  workItemId: string,
  opts?: { tone?: string; replyAll?: boolean; instruction?: string },
): Promise<DraftActionResult> {
  const user = await requireUser();
  // Effective config: env + admin-panel overrides (draft model, prices, pause/caps).
  const eff = await getEffectiveAi(user.id, 'draft');
  if (!eff) {
    return { ok: false, error: 'AI is not configured. You can still write and send a reply yourself.' };
  }
  if (eff.blocked) {
    return {
      ok: false,
      error: `${eff.blockedReason ?? 'AI is unavailable right now.'} You can still write the reply yourself.`,
    };
  }
  const { cfg, client, rates } = eff;

  const db = createClient();
  const ctx = await loadReplyContext(db, workItemId);
  if (ctx.error || !ctx.inbound || !ctx.item) return { ok: false, error: ctx.error ?? 'Cannot reply.' };
  const { item, inbound } = { item: ctx.item, inbound: ctx.inbound };

  // Manager identity + memory (Phase 10): tone/preferences to follow, hard
  // "never do" limits to obey, and saved context — scoped to the recipient.
  const [{ data: profile }, { data: memRows }, mailbox] = await Promise.all([
    db.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
    db
      .from('manager_memories')
      .select('id, memory_type, memory_text, scope, scope_ref, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(200),
    getActiveMailbox(db),
  ]);
  const memoryNotes = memoryNotesForDraft((memRows ?? []) as MemoryRow[], {
    email: ctx.inbound.sender_email,
    name: ctx.inbound.sender_name,
  });

  const tone = asTone(opts?.tone);
  const replyAll = opts?.replyAll === true;
  // 'waiting_on_them' = the manager already answered and is owed something →
  // the draft is a follow-up nudge, not a reply (the old prompt wrote backwards
  // "we'll get back to you" drafts for these).
  const purpose: DraftPurpose = item.category === 'waiting_on_them' ? 'follow_up' : 'reply';
  const prompt = buildDraftPrompt({
    subject: inbound.subject ?? item.title ?? null,
    recipientName: inbound.sender_name ?? inbound.sender_email ?? null,
    managerName: profile?.full_name ?? null,
    latestMessage: bodyForAi({
      body_text: inbound.body_text,
      body_html: inbound.body_html,
      body_preview: inbound.body_preview,
    }),
    tone,
    toneNotes: memoryNotes.toneNotes,
    hardRules: memoryNotes.hardRules,
    contextNotes: memoryNotes.contextNotes,
    instruction: opts?.instruction ?? null,
    purpose,
    threadContext: threadContextFor(ctx.recent ?? []),
  });

  let draft;
  let usage;
  try {
    const res = await client.complete(prompt);
    usage = res.usage;
    draft = parseDraft(res.content, inbound.subject ?? item.title ?? null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Draft generation failed';
    // Failed calls still land in the ledger so the admin console sees them.
    await recordAiUsage({
      userId: user.id,
      feature: 'draft',
      provider: cfg.provider,
      model: cfg.model,
      workItemId,
      error: msg.slice(0, 500),
    });
    return { ok: false, error: `Draft generation failed: ${msg}` };
  }

  // Who it will reach (mirrors Outlook Reply/Reply All), for display + storage.
  const recipients = replyRecipientsFor(inbound, mailbox?.mailbox_email ?? null, replyAll);

  // Always-on caution from a deterministic scan of the inbound + draft text.
  const sensitiveTopics = [
    ...new Set([
      ...detectSensitiveTopics(prompt.user),
      ...detectSensitiveTopics(draft.bodyText),
    ]),
  ];

  const metadata = {
    warnings: draft.warnings,
    requires_human_review: draft.requiresHumanReview || sensitiveTopics.length > 0,
    sensitive_topics: sensitiveTopics,
    reply_all: replyAll,
    bcc: [],
    instruction: opts?.instruction ?? null,
    generated_at: new Date().toISOString(),
    ...inboundMeta(inbound, mailbox?.mailbox_email ?? null),
  } as unknown as Json;

  // One active draft per item: update the existing non-terminal one, else insert.
  const upsert = await upsertActiveDraft(db, workItemId, {
    user_id: user.id,
    work_item_id: workItemId,
    email_message_id: inbound.id,
    status: 'draft',
    subject: draft.subject,
    body_text: draft.bodyText,
    ai_generated_body: draft.bodyText,
    user_edited_body: null,
    body_html: null,
    to_recipients: recipientsJson(recipients.to),
    cc_recipients: recipientsJson(recipients.cc),
    tone: draft.tone,
    model: cfg.model,
    prompt_version: DRAFT_PROMPT_VERSION,
    approved_at: null,
    sent_at: null,
    error: null,
    graph_draft_message_id: null,
    metadata,
  });
  if (upsert.error || !upsert.draft) return { ok: false, error: upsert.error ?? 'Could not save the draft.' };
  const saved = upsert.draft;

  // Record the AI call for cost/usage tracking (best-effort). Cost uses the
  // admin-panel prices when set (env/table otherwise). Written both to
  // ai_analyses (the per-item history) and the unified ai_usage ledger the
  // admin AI Control Center reads.
  if (usage && saved) {
    const cost = estimateCostUsd(cfg.model, usage, rates);
    await db.from('ai_analyses').insert({
      user_id: user.id,
      work_item_id: workItemId,
      model: cfg.model,
      prompt_version: DRAFT_PROMPT_VERSION,
      input_summary: prompt.user.slice(0, 500),
      category: 'draft',
      token_input: usage.inputTokens,
      token_output: usage.outputTokens,
      cost_estimate_usd: cost,
    });
    await recordAiUsage({
      userId: user.id,
      feature: 'draft',
      provider: cfg.provider,
      model: cfg.model,
      tokenInput: usage.inputTokens,
      tokenOutput: usage.outputTokens,
      costUsd: cost,
      workItemId,
    });
  }

  revalidatePath('/');
  return { ok: true, draft: toDraftView(saved) };
}

/**
 * Persist the manager's edits to a draft (no send). Keeps the AI's original in
 * ai_generated_body and records the human-edited text + an edited status.
 */
export async function saveDraft(
  draftId: string,
  input: {
    subject?: string;
    bodyText: string;
    replyAll?: boolean;
    to?: RecipientInput[];
    cc?: RecipientInput[];
    bcc?: RecipientInput[];
  },
): Promise<DraftActionResult> {
  await requireUser();
  const text = input.bodyText.trim();
  if (!text) return { ok: false, error: 'The reply is empty.' };

  const db = createClient();
  const { data: current } = await db
    .from('draft_replies')
    .select('metadata, status')
    .eq('id', draftId)
    .maybeSingle();
  if (!current) return { ok: false, error: 'Draft not found.' };
  if (current.status === 'sent') return { ok: false, error: 'This reply was already sent.' };

  const meta = {
    ...((current.metadata as Record<string, unknown> | null) ?? {}),
    ...(input.replyAll === undefined ? {} : { reply_all: input.replyAll }),
    ...(input.bcc === undefined ? {} : { bcc: sanitizeRecipients(input.bcc) }),
  } as unknown as Json;

  const patch: Database['public']['Tables']['draft_replies']['Update'] = {
    status: 'edited',
    body_text: text,
    user_edited_body: text,
    subject: input.subject?.trim() || undefined,
    metadata: meta,
  };
  if (input.to !== undefined) patch.to_recipients = recipientsJson(sanitizeRecipients(input.to));
  if (input.cc !== undefined) patch.cc_recipients = recipientsJson(sanitizeRecipients(input.cc));

  const { data, error } = await db
    .from('draft_replies')
    .update(patch)
    .eq('id', draftId)
    .select('*')
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, draft: toDraftView(data as DraftRow) };
}

/** Discard a draft (it never sends, leaves the composer). */
export async function discardDraft(draftId: string): Promise<DraftActionResult> {
  await requireUser();
  const db = createClient();
  const { error } = await db
    .from('draft_replies')
    .update({ status: 'discarded' })
    .eq('id', draftId)
    .neq('status', 'sent');
  if (error) return { ok: false, error: error.message };
  revalidatePath('/');
  return { ok: true };
}

/**
 * Approve and send a draft reply through Outlook (threaded, with quoted history).
 * This is the only send path and runs only on explicit manager approval. Saves the
 * latest edited text first, sends via Graph, writes an audit log, and marks the
 * work item done. In DRAFT_SEND_MODE=draft_only it builds an Outlook draft instead.
 */
export async function sendDraft(
  draftId: string,
  input: {
    bodyText: string;
    subject?: string;
    replyAll?: boolean;
    to?: RecipientInput[];
    cc?: RecipientInput[];
    bcc?: RecipientInput[];
  },
): Promise<DraftActionResult> {
  const user = await requireUser();
  const text = input.bodyText.trim();
  if (!text) return { ok: false, error: 'The reply is empty — nothing to send.' };

  const db = createClient();
  const { data: draft } = await db
    .from('draft_replies')
    .select('id, work_item_id, email_message_id, status, subject, metadata, to_recipients, cc_recipients')
    .eq('id', draftId)
    .maybeSingle();
  if (!draft) return { ok: false, error: 'Draft not found.' };
  if (draft.status === 'sent') return { ok: false, error: 'This reply was already sent.' };

  const draftMeta = (draft.metadata as Record<string, unknown> | null) ?? {};
  const replyAll = input.replyAll ?? draftMeta.reply_all === true;

  // Final recipients: the composer's edited lists, falling back to what's stored.
  const to = sanitizeRecipients(input.to ?? (draft.to_recipients as RecipientInput[] | null) ?? []);
  const cc = sanitizeRecipients(input.cc ?? (draft.cc_recipients as RecipientInput[] | null) ?? []);
  const bcc = sanitizeRecipients(input.bcc ?? (draftMeta.bcc as RecipientInput[] | undefined) ?? []);
  if (to.length === 0) {
    return { ok: false, error: 'Add at least one recipient in the To field before sending.' };
  }
  const recipients: ReplyRecipientsInput = { to, cc, bcc };

  // The original message we're replying to (Graph id + fields for the quoted block).
  let original: OriginalForQuote | null = null;
  if (draft.email_message_id) {
    const { data: m } = await db
      .from('email_messages')
      .select(
        'graph_message_id, sender_name, sender_email, subject, received_at, sent_at, to_recipients, body_html, body_text, body_preview',
      )
      .eq('id', draft.email_message_id)
      .maybeSingle();
    original = (m as OriginalForQuote | null) ?? null;
  }
  const graphMessageId = original?.graph_message_id ?? null;
  if (!graphMessageId) {
    return { ok: false, error: 'Could not find the original message to reply to. Try regenerating the draft.' };
  }

  // Compose the final HTML body: the manager's reply on top + the quoted original
  // (built from our stored copy, since the reply action doesn't add it for us).
  const quoted = buildQuotedOriginal({
    senderName: original?.sender_name,
    senderEmail: original?.sender_email,
    sentAt: original?.received_at ?? original?.sent_at,
    subject: original?.subject,
    toLine: (((original?.to_recipients as Recipient[] | null) ?? [])
      .map((r) => r.name || r.email)
      .filter(Boolean) as string[]).join(', '),
    bodyHtml: original?.body_html,
    bodyText: original?.body_text ?? original?.body_preview,
  });
  const replyHtml = composeReplyHtml(text, quoted);

  const mailbox = await getActiveMailbox(db);
  if (!mailbox) {
    return { ok: false, error: 'No connected Outlook mailbox. Connect one in Settings.' };
  }

  // Save the latest text + recipients before sending, so a failure preserves edits.
  await db
    .from('draft_replies')
    .update({
      body_text: text,
      user_edited_body: text,
      subject: input.subject?.trim() || undefined,
      to_recipients: recipientsJson(to),
      cc_recipients: recipientsJson(cc),
      metadata: { ...draftMeta, bcc, reply_all: replyAll } as unknown as Json,
      approved_at: new Date().toISOString(),
      status: 'approved',
    })
    .eq('id', draftId);

  // Require the Mail.Send scope (mailboxes connected before Phase 9 lack it).
  // Send mode comes from the admin panel (per-user → global → env).
  const draftOnly = (await getEffectiveSendMode(user.id)) === 'draft_only';
  if (!draftOnly && !(await hasSendScope(mailbox.integration_id))) {
    return {
      ok: false,
      needsReconnect: true,
      error: 'Reconnect Outlook to enable sending (we need permission to send on your behalf).',
    };
  }

  const token = await getValidAccessToken(mailbox.integration_id);
  if (!token) {
    return { ok: false, needsReconnect: true, error: 'Outlook token unavailable — reconnect in Settings.' };
  }

  try {
    const sent = draftOnly
      ? await createReplyDraft(token, graphMessageId, replyHtml, { recipients })
      : await sendReply(token, graphMessageId, replyHtml, { recipients });

    const nowIso = new Date().toISOString();
    await db
      .from('draft_replies')
      .update({
        status: draftOnly ? 'draft' : 'sent',
        sent_at: draftOnly ? null : nowIso,
        graph_draft_message_id: sent.graphDraftId,
        body_html: sent.htmlSent,
        subject: sent.subject ?? input.subject ?? draft.subject,
        to_recipients: recipientsJson(sent.to),
        cc_recipients: recipientsJson(sent.cc),
        metadata: { ...draftMeta, bcc: sent.bcc, reply_all: replyAll } as unknown as Json,
        error: null,
      })
      .eq('id', draftId);

    if (!draftOnly) {
      // Immutable audit of the send (service-write; AGENTS.md sensitive-action rule).
      await writeAudit({
        userId: user.id,
        action: 'email_sent',
        entityId: draftId,
        after: {
          work_item_id: draft.work_item_id,
          subject: sent.subject,
          to: sent.to,
          cc: sent.cc,
          bcc: sent.bcc,
          reply_all: replyAll,
          mailbox_id: mailbox.id,
        },
      });

      // Sending answers a "waiting on you" item → mark it done (resurfaces on reply).
      // EXCEPT "waiting on them": that send is a follow-up NUDGE — the other party
      // still owes the answer, so the item stays open on the radar (the next sync
      // re-ages its score and re-confirms intent against the new outbound).
      if (draft.work_item_id) {
        const { data: wi } = await db
          .from('work_items')
          .select('category, metadata')
          .eq('id', draft.work_item_id)
          .maybeSingle();
        const meta = (wi?.metadata as Record<string, unknown> | null) ?? {};
        if (wi?.category === 'waiting_on_them') {
          await db
            .from('work_items')
            .update({ metadata: { ...meta, last_nudged_at: nowIso } })
            .eq('id', draft.work_item_id);
        } else {
          await db
            .from('work_items')
            .update({
              status: 'done',
              completed_at: nowIso,
              metadata: { ...meta, resolved_at: nowIso, resolved_kind: 'replied' },
            })
            .eq('id', draft.work_item_id);
        }
      }

      // Phase 10 — if the manager steered this draft with a custom instruction,
      // suggest remembering it as a per-sender preference. Parked PENDING
      // (is_active=false): it does nothing until approved in Memory & Rules.
      await suggestMemoryFromInstruction(db, user.id, draftMeta, to[0], draft.work_item_id);
    }

    revalidatePath('/');
    const { data: fresh } = await db.from('draft_replies').select('*').eq('id', draftId).single();
    return { ok: true, draft: fresh ? toDraftView(fresh as DraftRow) : undefined };
  } catch (e) {
    const is403 = e instanceof GraphRequestError && e.status === 403;
    const message = is403
      ? 'Outlook refused to send — reconnect to grant send permission.'
      : e instanceof Error
        ? `Send failed: ${e.message}`
        : 'Send failed.';
    await db
      .from('draft_replies')
      .update({ status: 'failed', error: message.slice(0, 500) })
      .eq('id', draftId);
    // Failed sends are security/ops-relevant — surface them in the audit trail too.
    await writeAudit({
      userId: user.id,
      action: 'email_send_failed',
      entityId: draftId,
      after: { error: message.slice(0, 300), work_item_id: draft.work_item_id },
    });
    return { ok: false, needsReconnect: is403, error: message };
  }
}

/**
 * Phase 10 — propose a memory from a reused draft instruction. Deterministic
 * (no AI call), deduped on exact text, ALWAYS pending until the manager
 * approves it in Memory & Rules. Best-effort: a failure never blocks a send.
 */
async function suggestMemoryFromInstruction(
  db: SupabaseClient<Database>,
  userId: string,
  draftMeta: Record<string, unknown>,
  recipient: { name?: string | null; email?: string | null } | undefined,
  workItemId: string | null,
): Promise<void> {
  try {
    const instruction =
      typeof draftMeta.instruction === 'string' ? draftMeta.instruction.trim() : '';
    // Too short to be a reusable preference ("shorter", "fix typo", …).
    if (instruction.length < 12 || !recipient?.email) return;
    const who = recipient.name?.trim() || recipient.email;
    const email = recipient.email;
    const text = `When replying to ${who}: ${instruction}`.slice(0, 300);
    const { data: dupe } = await db
      .from('manager_memories')
      .select('id')
      .eq('user_id', userId)
      .eq('memory_text', text)
      .limit(1);
    if (dupe && dupe.length > 0) return;
    await db.from('manager_memories').insert({
      user_id: userId,
      memory_type: 'preference',
      memory_text: text,
      scope: 'person',
      scope_ref: email.toLowerCase(),
      source: 'ai_suggested',
      is_active: false,
      metadata: {
        status: 'pending',
        suggested_from: 'draft_instruction',
        work_item_id: workItemId,
      } as unknown as Json,
    });
  } catch {
    // Suggestion is a nicety — never let it interfere with the send result.
  }
}

/** Write an audit row via the service role (audit_logs is service-write only). */
async function writeAudit(input: {
  userId: string;
  action: string;
  entityId: string;
  after: Record<string, unknown>;
}): Promise<void> {
  try {
    const service = createServiceClient();
    await service.from('audit_logs').insert({
      user_id: input.userId,
      actor_type: 'user',
      actor_id: input.userId,
      action: input.action,
      entity_type: 'draft_reply',
      entity_id: input.entityId,
      after: input.after as unknown as Json,
    });
  } catch {
    // Never block a successful send on audit-write trouble; it's best-effort here.
  }
}
