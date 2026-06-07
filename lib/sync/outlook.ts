import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/graph/tokens';
import { fetchRecentMessages, type GraphMessage, type GraphRecipient } from '@/lib/graph/mail';
import type { Database } from '@/lib/database.types';

/**
 * Initial Outlook email sync (Phase 4). Server-only.
 *
 * Pulls recent Inbox + Sent messages via Graph and upserts them into the
 * existing tables (email_messages, email_threads, people) — idempotently, using
 * the unique constraints from Phase 1. No schema change. Bounded counts keep it
 * a quick synchronous operation; delta/webhooks/background come in Phase 5.
 * work_items are created later by the Phase 6 follow-up engine.
 */

const INBOX_COUNT = 50;
const SENT_COUNT = 25;

type MessageRow = Database['public']['Tables']['email_messages']['Insert'];
type ThreadRow = Database['public']['Tables']['email_threads']['Insert'];
type PersonRow = Database['public']['Tables']['people']['Insert'];

type SyncContext = { userId: string; integrationId: string; mailboxId: string };

export type SyncResult = {
  ok: boolean;
  inbox: number;
  sent: number;
  threads: number;
  people: number;
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
    web_link: msg.webLink ?? null,
    received_at: msg.receivedDateTime ?? null,
    sent_at: msg.sentDateTime ?? null,
  };
}

/** Group messages into one email_threads row per conversation. */
export function buildThreadRows(
  messages: { msg: GraphMessage; direction: 'inbound' | 'outbound' }[],
  ctx: SyncContext,
): ThreadRow[] {
  const byConv = new Map<string, ThreadRow>();
  for (const { msg, direction } of messages) {
    const convId = msg.conversationId;
    if (!convId) continue;
    const when = msg.receivedDateTime ?? msg.sentDateTime ?? null;
    const existing = byConv.get(convId);
    if (!existing) {
      byConv.set(convId, {
        user_id: ctx.userId,
        integration_id: ctx.integrationId,
        mailbox_id: ctx.mailboxId,
        graph_conversation_id: convId,
        subject_normalized: (msg.subject ?? '').replace(/^(re|fwd?):\s*/i, '').trim() || null,
        latest_message_at: when,
        latest_inbound_at: direction === 'inbound' ? when : null,
        latest_outbound_at: direction === 'outbound' ? when : null,
      });
    } else {
      if (when && (!existing.latest_message_at || when > existing.latest_message_at)) {
        existing.latest_message_at = when;
      }
      if (
        direction === 'inbound' &&
        when &&
        (!existing.latest_inbound_at || when > existing.latest_inbound_at)
      ) {
        existing.latest_inbound_at = when;
      }
      if (
        direction === 'outbound' &&
        when &&
        (!existing.latest_outbound_at || when > existing.latest_outbound_at)
      ) {
        existing.latest_outbound_at = when;
      }
    }
  }
  return [...byConv.values()];
}

/** Extract unique people (by email) from message senders/recipients. */
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

// ---------------------------------------------------------------------------
// Orchestrator (DB) — writes own rows via the authenticated client (RLS).
// ---------------------------------------------------------------------------

export async function syncOutlookForUser(userId: string): Promise<SyncResult> {
  const empty: SyncResult = { ok: false, inbox: 0, sent: 0, threads: 0, people: 0 };
  const supabase = createClient();

  const { data: mailbox } = await supabase
    .from('mailboxes')
    .select('id, integration_id')
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

  const ctx: SyncContext = {
    userId,
    integrationId: mailbox.integration_id,
    mailboxId: mailbox.id,
  };

  let inbox: GraphMessage[] = [];
  let sent: GraphMessage[] = [];
  try {
    [inbox, sent] = await Promise.all([
      fetchRecentMessages(token, 'inbox', INBOX_COUNT),
      fetchRecentMessages(token, 'sentitems', SENT_COUNT),
    ]);
  } catch (e) {
    return { ...empty, error: e instanceof Error ? e.message : 'Graph fetch failed.' };
  }

  const tagged = [
    ...inbox.map((msg) => ({ msg, direction: 'inbound' as const })),
    ...sent.map((msg) => ({ msg, direction: 'outbound' as const })),
  ];

  // 1) Threads first (messages reference thread_id). Map conversationId -> id.
  const threadRows = buildThreadRows(tagged, ctx);
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

  // 2) Messages (idempotent on mailbox_id + graph_message_id).
  const messageRows = tagged.map(({ msg, direction }) => {
    const row = toEmailMessageRow(msg, direction, ctx);
    row.thread_id = msg.conversationId ? (convToThreadId.get(msg.conversationId) ?? null) : null;
    return row;
  });
  if (messageRows.length > 0) {
    const { error } = await supabase
      .from('email_messages')
      .upsert(messageRows, { onConflict: 'mailbox_id,graph_message_id' });
    if (error) return { ...empty, error: `Saving messages failed: ${error.message}` };
  }

  // 3) People (idempotent on user_id + email).
  const peopleRows = buildPeopleRows([...inbox, ...sent], userId);
  if (peopleRows.length > 0) {
    const { error } = await supabase
      .from('people')
      .upsert(peopleRows, { onConflict: 'user_id,email', ignoreDuplicates: true });
    if (error) return { ...empty, error: `Saving people failed: ${error.message}` };
  }

  // 4) Record the sync cursor (last successful sync time). resource_id is a
  // constant ('all') so the unique (mailbox_id, resource_type, resource_id)
  // dedupes — a NULL resource_id would not (NULLs are distinct in Postgres).
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
  };
}
