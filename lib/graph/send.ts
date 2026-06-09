import 'server-only';
import { graphPost, graphPatchNoContent, graphPostNoContent } from './client';
import { composeReplyHtml, toGraphRecipients, type Recipient } from '@/lib/email/reply';

/**
 * Phase 9 — send a draft reply through Microsoft Graph, threaded correctly.
 *
 * Flow (preserves the conversation, the "RE:" subject, and the quoted history —
 * exactly like hitting Reply in Outlook, but with the recipients the manager
 * finalised in the composer):
 *   1. createReply / createReplyAll on the message being answered → Graph returns
 *      a server-side *draft* with the quoted original (and default recipients).
 *   2. PATCH that draft: put the manager's reply on top of the quote AND set the
 *      exact To/Cc/Bcc the manager chose (so removing/adding recipients is honoured).
 *   3. POST .../send to actually send it.
 *
 * Nothing here decides to send — the caller does that only after explicit
 * approval. Requires the Mail.Send scope (added in Phase 9); a 403 surfaces as a
 * GraphRequestError the caller turns into "reconnect Outlook to enable sending".
 */

type GraphDraft = {
  id: string;
  subject?: string | null;
  body?: { contentType?: string; content?: string } | null;
  toRecipients?: { emailAddress?: { name?: string; address?: string } }[] | null;
  ccRecipients?: { emailAddress?: { name?: string; address?: string } }[] | null;
  bccRecipients?: { emailAddress?: { name?: string; address?: string } }[] | null;
};

/** The manager's finalised recipients from the composer. */
export type ReplyRecipientsInput = { to: Recipient[]; cc: Recipient[]; bcc: Recipient[] };

export type SentReply = {
  graphDraftId: string;
  subject: string | null;
  to: Recipient[];
  cc: Recipient[];
  bcc: Recipient[];
  /** The full HTML actually sent (reply + quoted original). */
  htmlSent: string;
};

function mapRecipients(
  list: { emailAddress?: { name?: string; address?: string } }[] | null | undefined,
): Recipient[] {
  return (list ?? [])
    .map((r) => ({ name: r.emailAddress?.name ?? null, email: r.emailAddress?.address ?? null }))
    .filter((r) => r.email);
}

/**
 * createReply/createReplyAll → PATCH (body + the finalised recipients, when given).
 * Shared by both the send and draft-only paths. Returns the draft id and what was
 * set, so the caller can persist it.
 */
async function buildReplyDraft(
  accessToken: string,
  messageId: string,
  replyText: string,
  opts: { replyAll: boolean; recipients?: ReplyRecipientsInput },
): Promise<{ draftId: string; subject: string | null; sent: SentReply }> {
  const action = opts.replyAll ? 'createReplyAll' : 'createReply';
  // 1. Graph builds the threaded draft (subject + quoted history + default recipients).
  const draft = await graphPost<GraphDraft>(
    accessToken,
    `/me/messages/${encodeURIComponent(messageId)}/${action}`,
    {},
  );

  // 2. Compose the body and, when the manager edited recipients, set them exactly.
  const htmlSent = composeReplyHtml(replyText, draft.body?.content ?? null);
  const patch: Record<string, unknown> = { body: { contentType: 'HTML', content: htmlSent } };
  const r = opts.recipients;
  if (r && r.to.length > 0) {
    patch.toRecipients = toGraphRecipients(r.to);
    patch.ccRecipients = toGraphRecipients(r.cc);
    patch.bccRecipients = toGraphRecipients(r.bcc);
  }
  await graphPatchNoContent(accessToken, `/me/messages/${encodeURIComponent(draft.id)}`, patch);

  // Reflect what the message will actually carry (edited lists win over the defaults).
  const sent: SentReply = {
    graphDraftId: draft.id,
    subject: draft.subject ?? null,
    to: r && r.to.length > 0 ? r.to : mapRecipients(draft.toRecipients),
    cc: r && r.to.length > 0 ? r.cc : mapRecipients(draft.ccRecipients),
    bcc: r && r.to.length > 0 ? r.bcc : mapRecipients(draft.bccRecipients),
    htmlSent,
  };
  return { draftId: draft.id, subject: draft.subject ?? null, sent };
}

/**
 * Create a reply draft (with the manager's finalised recipients + body) and SEND it.
 * `messageId` is the Graph id of the message being replied to.
 */
export async function sendReply(
  accessToken: string,
  messageId: string,
  replyText: string,
  opts: { replyAll: boolean; recipients?: ReplyRecipientsInput },
): Promise<SentReply> {
  const { draftId, sent } = await buildReplyDraft(accessToken, messageId, replyText, opts);
  await graphPostNoContent(accessToken, `/me/messages/${encodeURIComponent(draftId)}/send`);
  return sent;
}

/**
 * Build a threaded reply *draft* in Outlook without sending it (the draft-only
 * fallback). Returns the draft id so the manager can finish it in Outlook.
 */
export async function createReplyDraft(
  accessToken: string,
  messageId: string,
  replyText: string,
  opts: { replyAll: boolean; recipients?: ReplyRecipientsInput },
): Promise<SentReply> {
  const { sent } = await buildReplyDraft(accessToken, messageId, replyText, opts);
  return sent;
}
