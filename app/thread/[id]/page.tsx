import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { Icon } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';
import { MessageBody } from '@/components/thread/MessageBody';
import { BackButton } from '@/components/thread/BackButton';
import { decodeThreadId } from '@/lib/thread';

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
 * Full-screen thread view (Phase 6.6). Shows the entire Outlook conversation —
 * every message, oldest → newest, with sender/recipients, the manager's local
 * time, and the full email body (sandboxed). Reached from the Inbox and from
 * dashboard work items, so the manager can read exactly what happened (e.g. before
 * approving an AI reply later). RLS-scoped; only the user's own mail is returned.
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

  const { data } = await supabase
    .from('email_messages')
    .select(COLS)
    .eq('graph_conversation_id', conversationId)
    .is('deleted_at', null);

  // Sort chronologically by each message's effective time. Outbound (sent) messages
  // have no received_at, so we coalesce received_at -> sent_at and sort in JS
  // (a DB nulls-first order would push your own replies to the top).
  const eff = (m: ThreadMessage) => new Date(m.received_at ?? m.sent_at ?? 0).getTime();
  const messages = ([...((data ?? []) as ThreadMessage[])]).sort((a, b) => eff(a) - eff(b));
  if (messages.length === 0) notFound();

  const subject =
    messages.find((m) => m.subject?.trim())?.subject?.replace(/^(re|fw|fwd):\s*/i, '') ||
    '(no subject)';
  const lastWebLink = [...messages].reverse().find((m) => m.web_link)?.web_link ?? null;

  return (
    <main className="v-scroll mx-auto h-screen w-full max-w-[860px] overflow-y-auto px-5 py-8">
      <div className="mb-6 flex items-center gap-3">
        <BackButton />
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate font-display text-[24px] font-semibold tracking-tight">
            {subject}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'} in this conversation
          </p>
        </div>
        {lastWebLink && (
          <a
            href={lastWebLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-none items-center gap-2 rounded-[11px] border border-line bg-panel px-3 py-[9px] text-[13px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
          >
            <Icon name="mail" className="h-[15px] w-[15px]" />
            Open in Outlook
          </a>
        )}
      </div>

      <ul className="flex flex-col gap-4">
        {messages.map((m) => {
          const outbound = m.direction === 'outbound';
          const when = outbound ? (m.sent_at ?? m.received_at) : (m.received_at ?? m.sent_at);
          return (
            <li
              key={m.id}
              className={[
                'rounded-[14px] border bg-panel p-4 shadow-soft',
                outbound ? 'border-accent/40' : 'border-line',
              ].join(' ')}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[13.5px] font-semibold text-ink">
                    {m.sender_name || m.sender_email || 'Unknown sender'}
                  </span>
                  {outbound && (
                    <span className="ml-2 rounded-full bg-accent-soft px-2 py-[1px] text-[11px] font-semibold text-accent">
                      You
                    </span>
                  )}
                </div>
                <LocalTime iso={when} className="flex-none font-mono text-[11px] text-muted" />
              </div>
              <div className="mt-[2px] text-[12px] text-muted">
                {names(m.to_recipients) && <span>To: {names(m.to_recipients)}</span>}
                {names(m.cc_recipients) && <span className="ml-2">Cc: {names(m.cc_recipients)}</span>}
              </div>
              <div className="mt-3">
                <MessageBody html={m.body_html} text={m.body_text || m.body_preview} />
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
