import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { decodeThreadId } from '@/lib/thread';
import { splitQuotedHtml, splitQuotedText } from '@/lib/email/quotes';
import { ThreadView, type AiRead, type ThreadMessageVM } from '@/components/thread/ThreadView';

export const dynamic = 'force-dynamic';

type Recipient = { name?: string; email?: string };

type ThreadMessage = {
  id: string;
  subject: string | null;
  sender_name: string | null;
  sender_email: string | null;
  to_recipients: Recipient[] | null;
  cc_recipients: Recipient[] | null;
  received_at: string | null;
  sent_at: string | null;
  direction: string | null;
  body_html: string | null;
  body_text: string | null;
  body_preview: string | null;
  web_link: string | null;
};

const COLS =
  'id, subject, sender_name, sender_email, to_recipients, cc_recipients, received_at, sent_at, direction, body_html, body_text, body_preview, web_link';

function names(list: Recipient[] | null): string {
  return (list ?? []).map((r) => r.name || r.email).filter(Boolean).join(', ');
}

/**
 * Full-screen thread view — the "reading room". The server gathers the whole
 * Outlook conversation (RLS-scoped), splits the quoted history every reply
 * re-pastes (lib/email/quotes), and pulls Vesta's existing analysis of this
 * thread (the radar work item) for the pinned "Vesta's read" header. The
 * client (ThreadView) renders the timeline: newest message open, the rest
 * collapsed, quoted history behind a toggle.
 */
export default async function ThreadPage({ params }: { params: { id: string } }) {
  await requireUser();
  const supabase = createClient();

  let conversationId: string;
  try {
    conversationId = decodeThreadId(params.id);
  } catch {
    notFound();
  }

  const [{ data }, { data: item }] = await Promise.all([
    supabase
      .from('email_messages')
      .select(COLS)
      .eq('graph_conversation_id', conversationId)
      .is('deleted_at', null),
    // Vesta's read: the radar item AI built for this conversation (if any).
    supabase
      .from('work_items')
      .select('id, summary, urgency_reason, category, due_at, status')
      .eq('source', 'outlook')
      .eq('source_external_id', conversationId)
      .maybeSingle(),
  ]);

  // Sort chronologically by each message's effective time. Outbound (sent)
  // messages have no received_at, so we coalesce received_at -> sent_at and
  // sort in JS (a DB nulls-first order would push your own replies to the top).
  const eff = (m: ThreadMessage) => new Date(m.received_at ?? m.sent_at ?? 0).getTime();
  const rows = ([...((data ?? []) as ThreadMessage[])]).sort((a, b) => eff(a) - eff(b));
  if (rows.length === 0) notFound();

  const subject =
    rows.find((m) => m.subject?.trim())?.subject?.replace(/^(re|fw|fwd):\s*/i, '') ||
    '(no subject)';
  const outlookLink = [...rows].reverse().find((m) => m.web_link)?.web_link ?? null;

  const messages: ThreadMessageVM[] = rows.map((m) => {
    const outbound = m.direction === 'outbound';
    const html = m.body_html ? splitQuotedHtml(m.body_html) : null;
    const rawText = m.body_text || m.body_preview || '';
    const text = !m.body_html && rawText ? splitQuotedText(rawText) : null;
    return {
      id: m.id,
      senderName: m.sender_name || m.sender_email || 'Unknown sender',
      senderEmail: m.sender_email?.toLowerCase() ?? null,
      toLine: names(m.to_recipients),
      ccLine: names(m.cc_recipients),
      whenIso: outbound ? (m.sent_at ?? m.received_at) : (m.received_at ?? m.sent_at),
      outbound,
      bodyHtml: html ? html.main : null,
      bodyText: text ? text.main : html ? null : rawText,
      quotedHtml: html?.quoted ?? null,
      quotedText: text?.quoted ?? null,
      preview: (m.body_preview ?? rawText).replace(/\s+/g, ' ').trim().slice(0, 120),
    };
  });

  const aiRead: AiRead | null =
    item && item.summary
      ? {
          workItemId: item.id,
          summary: item.summary,
          reason: item.urgency_reason,
          category: item.category,
          due: item.due_at ? item.due_at.slice(0, 10) : null,
          open: item.status === 'open',
        }
      : null;

  return (
    <ThreadView subject={subject} messages={messages} aiRead={aiRead} outlookLink={outlookLink} />
  );
}
