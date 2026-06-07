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
].join(',');

export type MailFolder = 'inbox' | 'sentitems';

/** Fetch the most recent messages from a folder (newest first). */
export async function fetchRecentMessages(
  accessToken: string,
  folder: MailFolder,
  top: number,
): Promise<GraphMessage[]> {
  const path =
    `/me/mailFolders/${folder}/messages` +
    `?$select=${SELECT}&$top=${top}&$orderby=receivedDateTime desc`;
  const res = await graphGet<GraphList<GraphMessage>>(accessToken, path);
  return res.value ?? [];
}
