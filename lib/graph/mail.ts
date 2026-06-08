import { graphGet, graphGetUrl } from './client';

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
  /** Full body (we request it so the thread view can show the whole email). */
  body?: { contentType?: 'html' | 'text'; content?: string };
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

/** Fields we pull. Includes the full `body` so the thread view can show the whole
 * email (stored in email_messages.body_html/body_text); preview stays for lists. */
const SELECT = [
  'id',
  'conversationId',
  'conversationIndex',
  'internetMessageId',
  'subject',
  'bodyPreview',
  'body',
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

// ---------------------------------------------------------------------------
// Delta sync (Phase 5) — Graph "delta query" tracks exactly what changed in the
// inbox since last time: added/updated messages AND removed (deleted/moved) ids,
// plus a deltaLink to resume from. This is what server-side push (e.g. phone
// notifications with no browser open) needs — precise change detection.
// ---------------------------------------------------------------------------

/** A delta page item may be a removed marker ({ '@removed': {...}, id }). */
export type GraphDeltaItem = GraphMessage & { '@removed'?: { reason?: string } };

type GraphDeltaPage = {
  value?: GraphDeltaItem[];
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
};

export type DeltaResult = {
  messages: GraphMessage[];
  removedIds: string[];
  /** Set when the enumeration caught up — persist and resume from it next run. */
  deltaLink: string | null;
  /** Set when more pages remain (large first sync) — resume here next run. */
  nextLink: string | null;
};

/** Split a delta page's items into live messages vs removed ids. Pure. */
export function splitDeltaItems(items: GraphDeltaItem[]): {
  messages: GraphMessage[];
  removedIds: string[];
} {
  const messages: GraphMessage[] = [];
  const removedIds: string[] = [];
  for (const item of items) {
    if (item['@removed']) {
      if (item.id) removedIds.push(item.id);
    } else {
      messages.push(item);
    }
  }
  return { messages, removedIds };
}

const INBOX_DELTA_PATH = `/me/mailFolders/inbox/messages/delta?$select=${SELECT}`;

/**
 * Fetch inbox changes via Graph delta query. Pass the stored cursor (a deltaLink,
 * or a nextLink to resume a large initial sync) — or null for the first run.
 * Returns added/updated messages, removed ids, and the cursor to persist:
 * deltaLink when caught up, or nextLink when more pages remain. Bounded by
 * maxPages so a huge first sync resumes across runs instead of timing out.
 */
export async function fetchInboxDelta(
  accessToken: string,
  cursorUrl: string | null,
  maxPages = 10,
): Promise<DeltaResult> {
  const messages: GraphMessage[] = [];
  const removedIds: string[] = [];

  let page: GraphDeltaPage = cursorUrl
    ? await graphGetUrl<GraphDeltaPage>(accessToken, cursorUrl)
    : await graphGet<GraphDeltaPage>(accessToken, INBOX_DELTA_PATH);

  for (let i = 0; i < maxPages; i++) {
    const split = splitDeltaItems(page.value ?? []);
    messages.push(...split.messages);
    removedIds.push(...split.removedIds);

    if (page['@odata.deltaLink']) {
      return { messages, removedIds, deltaLink: page['@odata.deltaLink'], nextLink: null };
    }
    const next = page['@odata.nextLink'];
    if (!next) break; // neither delta nor next link (unexpected) — stop.
    if (i + 1 >= maxPages) {
      return { messages, removedIds, deltaLink: null, nextLink: next }; // resume next run
    }
    page = await graphGetUrl<GraphDeltaPage>(accessToken, next);
  }
  return { messages, removedIds, deltaLink: null, nextLink: null };
}
