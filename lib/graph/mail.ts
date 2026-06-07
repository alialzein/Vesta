import { graphGet } from './client';

/**
 * Microsoft Graph mail fetch (Phase 4). Server-only. Reads recent messages from
 * a well-known folder. Bounded by `top` so the initial sync is a quick,
 * synchronous operation (delta sync + background fetching come in Phase 5).
 */

export type GraphRecipient = {
  emailAddress?: { name?: string; address?: string };
};

export type GraphMessage = {
  id: string;
  conversationId?: string;
  conversationIndex?: string;
  internetMessageId?: string;
  subject?: string;
  bodyPreview?: string;
  from?: GraphRecipient;
  sender?: GraphRecipient;
  toRecipients?: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  receivedDateTime?: string;
  sentDateTime?: string;
  isRead?: boolean;
  hasAttachments?: boolean;
  importance?: string;
  webLink?: string;
  categories?: string[];
  /** Outlook Focused Inbox classification — drives triage (Phase 6.5). */
  inferenceClassification?: 'focused' | 'other';
  /** Follow-up flag the manager set in Outlook ({ flagStatus: 'flagged' | … }). */
  flag?: { flagStatus?: string };
};

type GraphList<T> = { value: T[] };

/** Fields we pull (keep it lean — we don't fetch full bodies in the initial sync). */
const SELECT = [
  'id',
  'conversationId',
  'conversationIndex',
  'internetMessageId',
  'subject',
  'bodyPreview',
  'from',
  'sender',
  'toRecipients',
  'ccRecipients',
  'receivedDateTime',
  'sentDateTime',
  'isRead',
  'hasAttachments',
  'importance',
  'webLink',
  'categories',
  'inferenceClassification',
  'flag',
].join(',');

export type MailFolder = 'inbox' | 'sentitems';

/**
 * Fetch the most recent messages from a folder (newest first).
 *
 * When `since` (ISO timestamp) is given, only messages received at/after it are
 * returned — incremental "only new since last sync". We filter and order on the
 * same property (receivedDateTime) so Graph accepts the combined query; it is
 * present on Sent items too (≈ the send time), so this works for both folders.
 */
export async function fetchRecentMessages(
  accessToken: string,
  folder: MailFolder,
  top: number,
  since?: string | null,
): Promise<GraphMessage[]> {
  const filter = since ? `&$filter=receivedDateTime ge ${encodeURIComponent(since)}` : '';
  const path =
    `/me/mailFolders/${folder}/messages` +
    `?$select=${SELECT}&$top=${top}&$orderby=receivedDateTime desc${filter}`;
  const res = await graphGet<GraphList<GraphMessage>>(accessToken, path);
  return res.value ?? [];
}
