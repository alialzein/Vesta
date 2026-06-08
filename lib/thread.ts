/**
 * Outlook conversation ids contain characters that aren't URL-path-safe (+, /, =).
 * We base64url-encode them for the /thread/[id] route and decode on the server.
 * Both the Inbox and dashboard work_items already carry the raw conversation id
 * (work_items.source_external_id), so they can link without an extra lookup.
 */
export function encodeThreadId(conversationId: string): string {
  return Buffer.from(conversationId, 'utf8').toString('base64url');
}

export function decodeThreadId(encoded: string): string {
  return Buffer.from(encoded, 'base64url').toString('utf8');
}
