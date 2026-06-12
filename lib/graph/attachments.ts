import 'server-only';
import { GraphRequestError } from './client';

/**
 * Message attachments + forwarding via Microsoft Graph.
 *
 * Attachments are fetched ON DEMAND (we never store file bytes — the mailbox
 * stays the source of truth): a metadata list for the row of chips, content
 * bytes for a clicked download, and inline (cid:) images so rich bodies stop
 * showing broken boxes. Forward uses Graph's own /forward so the original
 * formatting AND its attachments travel without us touching either.
 */

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

type GraphAttachment = {
  id: string;
  name?: string | null;
  contentType?: string | null;
  size?: number;
  isInline?: boolean;
  contentId?: string | null;
  contentBytes?: string | null;
  '@odata.type'?: string;
};

export type AttachmentMeta = {
  id: string;
  name: string;
  contentType: string | null;
  size: number;
  isInline: boolean;
  contentId: string | null;
  /** Only real files can be downloaded (item/reference attachments open in Outlook). */
  isFile: boolean;
};

export function toAttachmentMeta(a: GraphAttachment): AttachmentMeta {
  return {
    id: a.id,
    name: a.name?.trim() || 'attachment',
    contentType: a.contentType ?? null,
    size: a.size ?? 0,
    isInline: Boolean(a.isInline),
    contentId: a.contentId ?? null,
    isFile: (a['@odata.type'] ?? '').endsWith('fileAttachment'),
  };
}

async function graphGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new GraphRequestError(res.status, path, await res.text());
  return (await res.json()) as T;
}

/** Metadata only — no bytes (cheap even for huge files). */
export async function listAttachments(
  token: string,
  graphMessageId: string,
): Promise<AttachmentMeta[]> {
  const data = await graphGet<{ value: GraphAttachment[] }>(
    token,
    `/me/messages/${encodeURIComponent(graphMessageId)}/attachments?$select=id,name,contentType,size,isInline,contentId`,
  );
  return (data.value ?? []).map(toAttachmentMeta);
}

/** One attachment WITH its base64 content (fileAttachment only). */
export async function getAttachmentContent(
  token: string,
  graphMessageId: string,
  attachmentId: string,
): Promise<{ name: string; contentType: string | null; contentBytes: string } | null> {
  const a = await graphGet<GraphAttachment>(
    token,
    `/me/messages/${encodeURIComponent(graphMessageId)}/attachments/${encodeURIComponent(attachmentId)}`,
  );
  if (!a.contentBytes) return null;
  return {
    name: a.name?.trim() || 'attachment',
    contentType: a.contentType ?? null,
    contentBytes: a.contentBytes,
  };
}

/** Swap cid: references for data: URIs using the message's inline attachments
 *  (pure — unit tested). Unmatched cids are left for the iframe CSS to hide. */
export function inlineCidImages(
  html: string,
  images: { contentId: string; contentType: string | null; contentBytes: string }[],
): string {
  let out = html;
  for (const img of images) {
    if (!img.contentId) continue;
    const dataUri = `data:${img.contentType || 'image/png'};base64,${img.contentBytes}`;
    out = out.split(`cid:${img.contentId}`).join(dataUri);
  }
  return out;
}

/** POST /forward — Graph builds the forwarded body + carries attachments. */
export async function forwardMessage(
  token: string,
  graphMessageId: string,
  to: { email: string; name?: string | null }[],
  comment: string,
): Promise<void> {
  const path = `/me/messages/${encodeURIComponent(graphMessageId)}/forward`;
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comment,
      toRecipients: to.map((r) => ({
        emailAddress: { address: r.email, name: r.name ?? r.email },
      })),
    }),
  });
  if (!res.ok) throw new GraphRequestError(res.status, path, await res.text());
}
