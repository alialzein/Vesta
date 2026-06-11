import 'server-only';
import { graphPost, graphPatchNoContent, graphPostNoContent } from './client';
import { toGraphRecipients, type Recipient } from '@/lib/email/reply';

/**
 * Phase 9 — send a draft reply through Microsoft Graph.
 *
 * We use the `reply` action (POST /me/messages/{id}/reply), which needs only the
 * **Mail.Send** scope and sends in one call, threaded into the original
 * conversation and saved to Sent Items. We pass the full HTML body we composed
 * (the manager's reply + the quoted original) and the exact To/Cc/Bcc the manager
 * finalised, so removing/adding recipients is honoured.
 *
 * (We deliberately do NOT use createReply/createReplyAll for sending: those create
 * a *draft* and therefore require the broader Mail.ReadWrite scope. createReply is
 * only used by the optional draft-only mode below.)
 *
 * Nothing here decides to send — the caller does that only after explicit approval.
 * A 403 surfaces as a GraphRequestError the caller turns into a reconnect hint.
 */

/** The manager's finalised recipients from the composer. */
export type ReplyRecipientsInput = { to: Recipient[]; cc: Recipient[]; bcc: Recipient[] };

export type SentReply = {
  /** The created Outlook draft id (draft-only mode); null when sent via the reply action. */
  graphDraftId: string | null;
  subject: string | null;
  to: Recipient[];
  cc: Recipient[];
  bcc: Recipient[];
  /** The full HTML body that was sent (reply + quoted original). */
  htmlSent: string;
};

/** Build the `message` overrides (recipients) for the reply action / draft patch. */
function recipientOverrides(r: ReplyRecipientsInput): Record<string, unknown> {
  return {
    toRecipients: toGraphRecipients(r.to),
    ccRecipients: toGraphRecipients(r.cc),
    bccRecipients: toGraphRecipients(r.bcc),
  };
}

/**
 * Reply to a message in one Graph call (Mail.Send): sets the HTML body + the exact
 * recipients and sends it, threaded. `messageId` is the Graph id of the message
 * being answered; `replyHtml` is the already-composed body (reply + quoted original).
 */
export async function sendReply(
  accessToken: string,
  messageId: string,
  replyHtml: string,
  opts: { recipients: ReplyRecipientsInput },
): Promise<SentReply> {
  await graphPostNoContent(accessToken, `/me/messages/${encodeURIComponent(messageId)}/reply`, {
    message: {
      body: { contentType: 'HTML', content: replyHtml },
      ...recipientOverrides(opts.recipients),
    },
  });
  return {
    graphDraftId: null,
    subject: null,
    to: opts.recipients.to,
    cc: opts.recipients.cc,
    bcc: opts.recipients.bcc,
    htmlSent: replyHtml,
  };
}

/**
 * Send a brand-new mail (not a reply) in one call — POST /me/sendMail, which
 * only needs Mail.Send. Used by the reminders engine (Phase B chat orders);
 * every reminder the cron sends was explicitly confirmed by the manager.
 */
export async function sendNewMail(
  accessToken: string,
  input: { to: string; subject: string; html: string },
): Promise<void> {
  await graphPostNoContent(accessToken, '/me/sendMail', {
    message: {
      subject: input.subject,
      body: { contentType: 'HTML', content: input.html },
      toRecipients: [{ emailAddress: { address: input.to } }],
    },
    saveToSentItems: true,
  });
}

type GraphDraft = { id: string; subject?: string | null };

/**
 * Build a threaded reply *draft* in Outlook without sending it (the optional
 * draft-only fallback, DRAFT_SEND_MODE=draft_only). This path creates a draft and
 * therefore needs the **Mail.ReadWrite** scope. Sets the body + recipients, then
 * leaves it for the manager to send from Outlook.
 */
export async function createReplyDraft(
  accessToken: string,
  messageId: string,
  replyHtml: string,
  opts: { recipients: ReplyRecipientsInput },
): Promise<SentReply> {
  const draft = await graphPost<GraphDraft>(
    accessToken,
    `/me/messages/${encodeURIComponent(messageId)}/createReply`,
    {},
  );
  await graphPatchNoContent(accessToken, `/me/messages/${encodeURIComponent(draft.id)}`, {
    body: { contentType: 'HTML', content: replyHtml },
    ...recipientOverrides(opts.recipients),
  });
  return {
    graphDraftId: draft.id,
    subject: draft.subject ?? null,
    to: opts.recipients.to,
    cc: opts.recipients.cc,
    bcc: opts.recipients.bcc,
    htmlSent: replyHtml,
  };
}
