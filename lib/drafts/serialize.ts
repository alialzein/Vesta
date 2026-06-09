import type { Database } from '@/lib/database.types';
import type { DraftRecipient, DraftView } from '@/lib/types';

/**
 * Phase 9 — shape a stored draft_replies row (+ the AI cautions kept in its
 * metadata) into the UI-facing DraftView. Shared by the draft server actions and
 * the dashboard data loader so the mapping stays in one place. Pure.
 */

export type DraftRow = Database['public']['Tables']['draft_replies']['Row'];

/** Statuses that mean "this draft is still live" (not sent or thrown away). */
export const ACTIVE_DRAFT_STATUSES = ['draft', 'edited', 'approved', 'failed'] as const;

type RawParticipants = { from: DraftRecipient | null; to: DraftRecipient[]; cc: DraftRecipient[] };

export function toDraftView(row: DraftRow): DraftView {
  const meta = (row.metadata as Record<string, unknown> | null) ?? {};
  const inbound = (meta.inbound as RawParticipants | undefined) ?? undefined;
  return {
    id: row.id,
    workItemId: row.work_item_id ?? '',
    status: row.status ?? 'draft',
    subject: row.subject ?? '',
    bodyText: row.user_edited_body ?? row.body_text ?? '',
    tone: row.tone ?? 'professional',
    warnings: Array.isArray(meta.warnings) ? (meta.warnings as string[]) : [],
    sensitiveTopics: Array.isArray(meta.sensitive_topics) ? (meta.sensitive_topics as string[]) : [],
    requiresHumanReview: meta.requires_human_review === true,
    to: Array.isArray(row.to_recipients) ? (row.to_recipients as unknown as DraftRecipient[]) : [],
    cc: Array.isArray(row.cc_recipients) ? (row.cc_recipients as unknown as DraftRecipient[]) : [],
    bcc: Array.isArray(meta.bcc) ? (meta.bcc as DraftRecipient[]) : [],
    replyAll: meta.reply_all === true,
    threadParticipants: inbound
      ? { from: inbound.from ?? null, to: inbound.to ?? [], cc: inbound.cc ?? [] }
      : undefined,
    managerEmail: typeof meta.manager_email === 'string' ? meta.manager_email : null,
  };
}
