'use server';

import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { Json } from '@/lib/database.types';
import { getValidAccessToken, hasSendScope } from '@/lib/graph/tokens';
import {
  forwardMessage,
  getAttachmentContent,
  inlineCidImages,
  listAttachments,
  type AttachmentMeta,
} from '@/lib/graph/attachments';

/**
 * Reading-room reply support — the bridge into the existing draft/send
 * pipeline (which is keyed on work items). Replying to a thread that already
 * has a radar item reuses it; a thread without one gets a quiet stub row
 * (status 'done', so the radar never shows it) that exists only to anchor
 * the draft, the audit trail, and the send — all the approval gates and
 * ledgers behave exactly like a dashboard reply.
 */
export async function ensureThreadWorkItem(
  conversationId: string,
): Promise<{ ok: true; workItemId: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const convId = String(conversationId ?? '').trim();
  if (!convId || convId.length > 300) return { ok: false, error: 'Invalid conversation.' };

  const supabase = createClient();
  const { data: existing } = await supabase
    .from('work_items')
    .select('id')
    .eq('source', 'outlook')
    .eq('source_external_id', convId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return { ok: true, workItemId: existing.id };

  // Anchor the stub to the thread's latest message (and verify the thread is
  // really the manager's own mail — RLS scopes the read).
  const { data: msg } = await supabase
    .from('email_messages')
    .select('subject, received_at, sent_at')
    .eq('graph_conversation_id', convId)
    .is('deleted_at', null)
    .order('received_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (!msg) return { ok: false, error: 'Thread not found.' };

  const nowIso = new Date().toISOString();
  const { data: created, error } = await supabase
    .from('work_items')
    .insert({
      user_id: user.id,
      source: 'outlook',
      source_external_id: convId,
      title: msg.subject?.trim() || '(no subject)',
      category: 'task',
      status: 'done',
      completed_at: nowIso,
      priority_score: 0,
      requires_reply: false,
      urgency_reason: 'Created when you replied from the thread view.',
      metadata: { origin: 'thread_reply' },
    })
    .select('id')
    .single();
  if (error || !created) return { ok: false, error: error?.message ?? 'Could not start the reply.' };
  return { ok: true, workItemId: created.id };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Server-action payloads carry base64 — keep downloads reasonable. */
const MAX_DOWNLOAD_BYTES = 12 * 1024 * 1024;

type MessageCtx =
  | { error: string; msg?: undefined; token?: undefined; integrationId?: undefined }
  | {
      error?: undefined;
      msg: { id: string; graph_message_id: string; subject: string | null; body_html: string | null };
      token: string;
      integrationId: string;
    };

/** The signed-in user's own message row + a fresh Graph token (RLS scopes the
 *  read, so a foreign message id simply isn't found). */
async function messageWithToken(emailMessageId: string): Promise<MessageCtx> {
  const supabase = createClient();
  const [{ data: msg }, { data: mailbox }] = await Promise.all([
    supabase
      .from('email_messages')
      .select('id, graph_message_id, subject, body_html')
      .eq('id', emailMessageId)
      .maybeSingle(),
    supabase
      .from('mailboxes')
      .select('integration_id')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
  ]);
  if (!msg?.graph_message_id) return { error: 'Message not found.' };
  if (!mailbox?.integration_id) return { error: 'No connected Outlook mailbox.' };
  const token = await getValidAccessToken(mailbox.integration_id);
  if (!token) return { error: 'Outlook token unavailable — reconnect in Settings.' };
  return {
    msg: {
      id: msg.id,
      graph_message_id: msg.graph_message_id,
      subject: msg.subject,
      body_html: msg.body_html,
    },
    token,
    integrationId: mailbox.integration_id,
  };
}

export type ThreadAttachmentsResult =
  | { ok: true; attachments: AttachmentMeta[] }
  | { ok: false; error: string };

/** Metadata for the attachments row (files only — inline images are handled
 *  by getInlineBody). Fetched on demand; bytes never touch our DB. */
export async function getMessageAttachments(
  emailMessageId: string,
): Promise<ThreadAttachmentsResult> {
  await requireUser();
  const ctx = await messageWithToken(emailMessageId);
  if (ctx.error !== undefined) return { ok: false, error: ctx.error };
  try {
    const all = await listAttachments(ctx.token, ctx.msg.graph_message_id);
    return { ok: true, attachments: all.filter((a) => !a.isInline) };
  } catch {
    return { ok: false, error: "Couldn't load attachments from Outlook just now." };
  }
}

export type DownloadResult =
  | { ok: true; name: string; contentType: string; base64: string }
  | { ok: false; error: string };

export async function downloadAttachment(
  emailMessageId: string,
  attachmentId: string,
): Promise<DownloadResult> {
  await requireUser();
  const ctx = await messageWithToken(emailMessageId);
  if (ctx.error !== undefined) return { ok: false, error: ctx.error };
  try {
    const file = await getAttachmentContent(ctx.token, ctx.msg.graph_message_id, attachmentId);
    if (!file) {
      return { ok: false, error: 'This attachment type can only be opened in Outlook.' };
    }
    if (file.contentBytes.length > (MAX_DOWNLOAD_BYTES * 4) / 3) {
      return { ok: false, error: 'This file is large — open the message in Outlook to download it.' };
    }
    return {
      ok: true,
      name: file.name,
      contentType: file.contentType ?? 'application/octet-stream',
      base64: file.contentBytes,
    };
  } catch {
    return { ok: false, error: "Couldn't download from Outlook just now — try again." };
  }
}

/** The message's HTML with its inline (cid:) images embedded as data URIs —
 *  signatures and pasted screenshots stop rendering as broken boxes. */
export async function getInlineBody(
  emailMessageId: string,
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  await requireUser();
  const ctx = await messageWithToken(emailMessageId);
  if (ctx.error !== undefined) return { ok: false, error: ctx.error };
  const html = ctx.msg.body_html ?? '';
  if (!html.includes('cid:')) return { ok: true, html };
  try {
    const all = await listAttachments(ctx.token, ctx.msg.graph_message_id);
    const inline = all.filter((a) => a.isInline && a.contentId && a.isFile && a.size < 2_000_000);
    const images: { contentId: string; contentType: string | null; contentBytes: string }[] = [];
    for (const a of inline.slice(0, 8)) {
      const file = await getAttachmentContent(ctx.token, ctx.msg.graph_message_id, a.id);
      if (file?.contentBytes) {
        images.push({
          contentId: a.contentId as string,
          contentType: file.contentType,
          contentBytes: file.contentBytes,
        });
      }
    }
    return { ok: true, html: inlineCidImages(html, images) };
  } catch {
    return { ok: true, html }; // inline images are best-effort decoration
  }
}

export type ForwardResult = { ok: true } | { ok: false; error: string; needsReconnect?: boolean };

/** Forward one message (Graph builds the body and carries its attachments).
 *  Audited like every send; needs the same Mail.Send scope as replies. */
export async function forwardThreadMessage(
  emailMessageId: string,
  input: { to: string[]; note?: string },
): Promise<ForwardResult> {
  const user = await requireUser();
  const to: string[] = [];
  for (const raw of (input.to ?? []).slice(0, 10)) {
    const email = String(raw ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, error: `"${raw}" is not a valid email address.` };
    if (!to.includes(email)) to.push(email);
  }
  if (to.length === 0) return { ok: false, error: 'Add at least one recipient.' };
  const note = String(input.note ?? '').trim().slice(0, 2000);

  const ctx = await messageWithToken(emailMessageId);
  if (ctx.error !== undefined) return { ok: false, error: ctx.error };
  if (!(await hasSendScope(ctx.integrationId))) {
    return {
      ok: false,
      needsReconnect: true,
      error: 'Reconnect Outlook to enable sending (we need permission to send on your behalf).',
    };
  }

  try {
    await forwardMessage(ctx.token, ctx.msg.graph_message_id, to.map((email) => ({ email })), note);
  } catch {
    return { ok: false, error: 'Outlook refused the forward just now — try again in a moment.' };
  }

  // Immutable audit of the send (best-effort, same rule as replies).
  try {
    const service = createServiceClient();
    await service.from('audit_logs').insert({
      user_id: user.id,
      actor_type: 'user',
      actor_id: user.id,
      action: 'email_forwarded',
      entity_type: 'email_message',
      entity_id: emailMessageId,
      after: { to, subject: ctx.msg.subject, note_length: note.length } as unknown as Json,
    });
  } catch {
    /* audit is best-effort here */
  }
  return { ok: true };
}
