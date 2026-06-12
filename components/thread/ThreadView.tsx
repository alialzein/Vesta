'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ensureBlankDraft, generateDraft, sendDraft } from '@/app/actions/drafts';
import { ensureThreadWorkItem } from '@/app/actions/thread';
import { MessageBody } from '@/components/thread/MessageBody';
import { BackButton } from '@/components/thread/BackButton';
import { Icon } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';
import { useToast } from '@/components/ui/Toast';

/**
 * The thread reading room — one conversation as an AI workspace, not a raw
 * mail dump. Vesta's read (the work item's analysis) is pinned on top with a
 * draft-reply CTA; messages sit on an avatar timeline, every message except
 * the newest starts collapsed to one line, and the quoted history that
 * replies re-paste is split off behind a "Show quoted history" toggle
 * (lib/email/quotes). Collapsed messages render no iframe — long threads got
 * lighter, not just prettier. Both themes via tokens.
 */

export type ThreadMessageVM = {
  id: string;
  senderName: string;
  senderEmail: string | null;
  toLine: string;
  ccLine: string;
  whenIso: string | null;
  outbound: boolean;
  /** Body with the re-pasted history split off (null html → text fallback). */
  bodyHtml: string | null;
  bodyText: string | null;
  /** The split-off quoted history (same format as the body), if any. */
  quotedHtml: string | null;
  quotedText: string | null;
  preview: string;
};

export type AiRead = {
  workItemId: string;
  summary: string;
  reason: string | null;
  category: string | null;
  due: string | null;
  open: boolean;
};

export function ThreadView({
  subject,
  messages,
  aiRead,
  outlookLink,
  conversationId,
}: {
  subject: string;
  messages: ThreadMessageVM[];
  aiRead: AiRead | null;
  outlookLink: string | null;
  conversationId: string;
}) {
  const lastId = messages[messages.length - 1]?.id;
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(lastId ? [lastId] : []));

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="v-scroll mx-auto h-[100dvh] w-full max-w-[860px] overflow-y-auto px-4 pb-[max(48px,env(safe-area-inset-bottom))] pt-6 sm:px-5 sm:pt-8">
      <div className="mb-4 flex items-center gap-3">
        <BackButton />
        <div className="min-w-0 flex-1">
          <h1 className="m-0 truncate font-display text-[24px] font-semibold tracking-tight">
            {subject}
          </h1>
          <p className="m-0 mt-1 text-[13px] text-muted">
            {messages.length} {messages.length === 1 ? 'message' : 'messages'} in this conversation
          </p>
        </div>
        {outlookLink && (
          <a
            href={outlookLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-none items-center gap-2 rounded-[11px] border border-line bg-panel px-3 py-[9px] text-[13px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
          >
            <Icon name="mail" className="h-[15px] w-[15px]" />
            Open in Outlook
          </a>
        )}
      </div>

      {aiRead && <VestaRead read={aiRead} />}

      {/* Timeline */}
      <ul className="relative m-0 mt-5 flex list-none flex-col gap-3 p-0 pl-[46px]">
        <span
          aria-hidden="true"
          className="absolute bottom-4 left-[17px] top-4 w-[2px] rounded bg-gradient-to-b from-accent-soft via-line to-transparent"
        />
        {messages.map((m) => (
          <MessageCard
            key={m.id}
            msg={m}
            expanded={expanded.has(m.id)}
            onToggle={() => toggle(m.id)}
          />
        ))}
      </ul>

      <ReplyComposer conversationId={conversationId} />
    </main>
  );
}

/**
 * Reply to the thread without leaving the reading room — type it yourself or
 * let Vesta write it (your text becomes the instruction), then YOU send. Runs
 * through the same draft/send pipeline as the dashboard: approval semantics,
 * audit log, send mode (draft_only lands in Outlook Drafts), and the radar
 * item closes when a real reply goes out.
 */
function ReplyComposer({ conversationId }: { conversationId: string }) {
  const { showToast } = useToast();
  const [text, setText] = useState('');
  const [draftId, setDraftId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'idle' | 'writing' | 'sending'>('idle');
  const [sentNote, setSentNote] = useState<string | null>(null);

  async function workItem(): Promise<string | null> {
    const res = await ensureThreadWorkItem(conversationId);
    if (!res.ok) {
      showToast(res.error);
      return null;
    }
    return res.workItemId;
  }

  async function writeWithVesta() {
    if (busy !== 'idle') return;
    setBusy('writing');
    setSentNote(null);
    const itemId = await workItem();
    if (!itemId) {
      setBusy('idle');
      return;
    }
    const res = await generateDraft(itemId, {
      instruction: text.trim() ? text.trim() : undefined,
    });
    setBusy('idle');
    if (!res.ok || !res.draft) {
      showToast(res.error ?? 'Vesta could not write the reply just now.');
      return;
    }
    setText(res.draft.bodyText);
    setDraftId(res.draft.id);
  }

  async function send() {
    const body = text.trim();
    if (!body || busy !== 'idle') return;
    setBusy('sending');
    setSentNote(null);
    let id = draftId;
    if (!id) {
      const itemId = await workItem();
      if (!itemId) {
        setBusy('idle');
        return;
      }
      const blank = await ensureBlankDraft(itemId);
      if (!blank.ok || !blank.draft) {
        setBusy('idle');
        showToast(blank.error ?? 'Could not start the reply.');
        return;
      }
      id = blank.draft.id;
    }
    const res = await sendDraft(id, { bodyText: body });
    setBusy('idle');
    if (!res.ok) {
      showToast(res.error ?? 'Could not send the reply.');
      return;
    }
    setText('');
    setDraftId(null);
    setSentNote(
      res.draft?.status === 'sent'
        ? 'Reply sent — it threads onto this conversation in Outlook.'
        : 'Reply saved to your Outlook Drafts (send mode is draft-only) — open Outlook to send it.',
    );
  }

  return (
    <section
      aria-label="Reply to this thread"
      className="mt-5 rounded-[14px] border border-line bg-panel p-4 shadow-soft"
    >
      <p className="m-0 mb-2 flex items-center gap-[7px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted">
        <Icon name="send" className="h-[12px] w-[12px] text-accent" />
        Reply to this thread
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(10, Math.max(3, text.split('\n').length))}
        disabled={busy === 'writing'}
        placeholder="Write your reply — or describe it and let Vesta write it (e.g. “confirm I'll attend tomorrow's session”)…"
        aria-label="Reply text"
        className="v-scroll w-full resize-none rounded-[11px] border border-line bg-panel-2 px-3 py-[10px] text-[13.5px] leading-relaxed text-ink outline-none transition placeholder:text-muted focus:border-accent disabled:opacity-60"
      />
      <div className="mt-[10px] flex flex-wrap items-center gap-[8px]">
        <button
          type="button"
          onClick={() => void writeWithVesta()}
          disabled={busy !== 'idle'}
          className="inline-flex items-center gap-[6px] rounded-[11px] border border-line-strong bg-panel-solid px-[13px] py-[8px] text-[12.5px] font-semibold text-ink transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon
            name="sparkle"
            className={`h-[13px] w-[13px] ${busy === 'writing' ? 'animate-vesta-pulse' : ''}`}
          />
          {busy === 'writing' ? 'Vesta is writing…' : draftId ? 'Rewrite with Vesta' : 'Write with Vesta'}
        </button>
        <button
          type="button"
          onClick={() => void send()}
          disabled={busy !== 'idle' || !text.trim()}
          className="inline-flex items-center gap-[6px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[14px] py-[8px] text-[12.5px] font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          <Icon name="send" className="h-[13px] w-[13px]" />
          {busy === 'sending' ? 'Sending…' : 'Send reply'}
        </button>
        <span className="text-[11px] text-muted">
          Replies to the latest message. Vesta writes — only you send.
        </span>
      </div>
      {sentNote && (
        <p className="m-0 mt-[8px] flex items-start gap-[6px] text-[12.5px] leading-snug text-green">
          <Icon name="check" className="mt-px h-[13px] w-[13px] flex-none" />
          {sentNote}
        </p>
      )}
    </section>
  );
}

/** Vesta's read of the thread — straight from the radar's AI analysis, with
 *  the same approval-gated draft flow the dashboard uses. */
function VestaRead({ read }: { read: AiRead }) {
  const { showToast } = useToast();
  const [drafting, setDrafting] = useState(false);
  const [drafted, setDrafted] = useState(false);

  async function draft() {
    if (drafting) return;
    setDrafting(true);
    const res = await generateDraft(read.workItemId);
    setDrafting(false);
    if (res.ok) {
      setDrafted(true);
      showToast('Draft ready — review and approve it in Draft Replies.');
    } else {
      showToast(res.error ?? 'Could not draft a reply just now.');
    }
  }

  return (
    <section
      aria-label="Vesta's read"
      className="rounded-[14px] border border-accent/35 bg-gradient-to-br from-accent-soft to-transparent p-4"
    >
      <p className="m-0 flex items-center gap-[7px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-accent">
        <Icon name="sparkle" className="h-[13px] w-[13px]" />
        Vesta&apos;s read
        {read.category && (
          <span className="rounded-full bg-panel px-[8px] py-[2px] text-[10px] normal-case tracking-normal text-ink-soft">
            {read.category === 'waiting' ? 'Waiting on you' : read.category}
          </span>
        )}
        {read.due && (
          <span className="rounded-full bg-panel px-[8px] py-[2px] text-[10px] normal-case tracking-normal text-ink-soft">
            due {read.due}
          </span>
        )}
      </p>
      <p className="m-0 mt-[7px] text-[13.5px] leading-relaxed text-ink">{read.summary}</p>
      {read.reason && (
        <p className="m-0 mt-[4px] text-[12px] leading-snug text-ink-soft">
          <b className="font-semibold">Why it matters:</b> {read.reason}
        </p>
      )}
      {read.open && (
        <div className="mt-[10px] flex flex-wrap items-center gap-[8px]">
          {drafted ? (
            <Link
              href="/drafts"
              prefetch
              className="inline-flex items-center gap-[6px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[13px] py-[8px] text-[12.5px] font-semibold text-white transition hover:brightness-110"
            >
              <Icon name="check" className="h-[13px] w-[13px]" />
              Review in Draft Replies
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => void draft()}
              disabled={drafting}
              className="inline-flex items-center gap-[6px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[13px] py-[8px] text-[12.5px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              <Icon
                name="sparkle"
                className={`h-[13px] w-[13px] ${drafting ? 'animate-vesta-pulse' : ''}`}
              />
              {drafting ? 'Vesta is writing…' : 'Draft a reply with Vesta'}
            </button>
          )}
          <span className="text-[11px] text-muted">Nothing sends without your approval.</span>
        </div>
      )}
    </section>
  );
}

/** Stable, theme-safe identity gradients for sender avatars (white text reads
 *  on all of them, in both themes — like Gmail's colored avatars). */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#2f7deb,#1d4ed8)',
  'linear-gradient(135deg,#7c5cd9,#5b3bbf)',
  'linear-gradient(135deg,#0d9488,#0f766e)',
  'linear-gradient(135deg,#d97706,#b45309)',
  'linear-gradient(135deg,#db2777,#be185d)',
  'linear-gradient(135deg,#16a34a,#15803d)',
];

function avatarStyle(key: string): { background: string } {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return { background: AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length] };
}

function initials(name: string): string {
  const parts = name.trim().split(/[\s.@_-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

function MessageCard({
  msg,
  expanded,
  onToggle,
}: {
  msg: ThreadMessageVM;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [showQuoted, setShowQuoted] = useState(false);
  const hasQuoted = Boolean(msg.quotedHtml || msg.quotedText);

  return (
    <li className="relative">
      <span
        aria-hidden="true"
        className="absolute -left-[46px] top-[10px] grid h-[36px] w-[36px] place-items-center rounded-full text-[12.5px] font-bold text-white shadow-soft"
        style={avatarStyle(msg.senderEmail ?? msg.senderName)}
      >
        {initials(msg.senderName)}
      </span>

      <div
        className={[
          'overflow-hidden rounded-[14px] border bg-panel shadow-soft transition',
          msg.outbound ? 'border-accent/40' : 'border-line',
        ].join(' ')}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="flex w-full items-baseline gap-3 border-none bg-transparent px-4 py-3 text-left transition hover:bg-panel-2"
        >
          <span className="min-w-0 flex-1">
            <span className="text-[13.5px] font-semibold text-ink">{msg.senderName}</span>
            {msg.outbound && (
              <span className="ml-2 rounded-full bg-accent-soft px-2 py-[1px] text-[11px] font-semibold text-accent">
                You
              </span>
            )}
            {expanded ? (
              <span className="mt-[2px] block truncate text-[12px] text-muted">
                {msg.toLine && <>To: {msg.toLine}</>}
                {msg.ccLine && <span className="ml-2">Cc: {msg.ccLine}</span>}
              </span>
            ) : (
              <span className="mt-[2px] block truncate text-[12.5px] text-muted">
                {msg.preview || '(no preview)'}
              </span>
            )}
          </span>
          <LocalTime iso={msg.whenIso} className="flex-none font-mono text-[11px] text-muted" />
          <Icon
            name={expanded ? 'chevronUp' : 'chevronDown'}
            className="h-[13px] w-[13px] flex-none self-center text-muted"
          />
        </button>

        {expanded && (
          <div className="px-4 pb-4">
            <MessageBody html={msg.bodyHtml} text={msg.bodyText} />
            {hasQuoted && (
              <div className="mt-[8px]">
                <button
                  type="button"
                  onClick={() => setShowQuoted((v) => !v)}
                  aria-expanded={showQuoted}
                  className="inline-flex items-center gap-[6px] rounded-[9px] border border-line bg-panel-2 px-[10px] py-[6px] text-[11.5px] font-semibold text-muted transition hover:border-accent hover:text-accent"
                >
                  <Icon name={showQuoted ? 'chevronUp' : 'chevronDown'} className="h-[11px] w-[11px]" />
                  {showQuoted ? 'Hide quoted history' : 'Show quoted history'}
                </button>
                {showQuoted && (
                  <div className="mt-[8px] opacity-80">
                    <MessageBody html={msg.quotedHtml} text={msg.quotedText} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
