'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { cancelChatAction, executeChatAction } from '@/app/actions/chat';
import { suggestAttendees, type AttendeeSuggestion } from '@/app/actions/people';
import type { ChatActionStatus, ChatActionView, ChatMessageView } from '@/lib/chat/data';
import { Icon } from '@/components/ui/Icon';

/**
 * Shared Ask Vesta chat pieces — used by both the full /chat page (ChatView)
 * and the dashboard's floating mini chat (ChatDock), so the two surfaces stay
 * one product: same bubbles, same learned-memory chips, same starters, same
 * chat-order confirmation cards.
 */

export const CHAT_STARTERS = [
  'What should I focus on right now?',
  "Who's waiting on me?",
  "What's in my briefing today?",
  'Remember that I prefer short, direct emails.',
  // Orders (chat-v3/v4/v5) — each proposes a Confirm card; nothing runs silently.
  'Remind me to call Ahmad tomorrow at 3pm.',
  'Snooze my top item until Monday 9am.',
  'Email me a reminder about my top item at 5pm.',
  'Draft a reply to my most urgent email.',
  'What meetings do I have today?',
];

export function LearnedChips({ learned }: { learned: string[] }) {
  if (learned.length === 0) return null;
  return (
    <div className="mt-[6px] flex flex-col gap-[4px]">
      {learned.map((text) => (
        <Link
          key={text}
          href="/?view=memory"
          prefetch
          title="Vesta saved this to Memory & Rules — open to review or delete it"
          className="inline-flex max-w-full items-start gap-[6px] self-start rounded-[10px] bg-accent-soft px-[10px] py-[6px] text-[11.5px] font-medium leading-snug text-accent transition hover:brightness-110"
        >
          <Icon name="brain" className="mt-px h-[12px] w-[12px] flex-none" />
          <span>
            <b>Saved to memory:</b> {text}
          </span>
        </Link>
      ))}
    </div>
  );
}

/**
 * Chat-order confirmation card (Phase A). Vesta only PROPOSED this action —
 * nothing has run. Confirm executes it through the same server actions the
 * dashboard buttons use; Cancel dismisses it. Settled cards (done / failed /
 * cancelled — including from past sessions) render their final state.
 */
export function ActionCard({ messageId, action }: { messageId: string; action: ChatActionView }) {
  const [status, setStatus] = useState<ChatActionStatus>(action.status);
  const [result, setResult] = useState<string | null>(action.result);
  const [busy, setBusy] = useState(false);
  // Meeting attendees are editable on the card until Confirm (Phase C).
  const editable = action.kind === 'create_meeting';
  const [attendees, setAttendees] = useState<string[]>(action.attendees ?? []);

  function confirm() {
    setBusy(true);
    void executeChatAction(messageId, editable ? { attendees } : undefined)
      .then((res) => {
        if (res.ok) {
          setStatus('done');
          setResult(res.result);
        } else {
          setStatus('failed');
          setResult(res.error);
        }
      })
      .finally(() => setBusy(false));
  }

  function cancel() {
    setStatus('cancelled');
    void cancelChatAction(messageId);
  }

  return (
    <div className="mt-[6px] w-full max-w-[360px] self-start rounded-[12px] border border-line bg-panel-2 p-3">
      <p className="m-0 flex items-start gap-[7px] text-[12.5px] font-semibold leading-snug text-ink">
        <Icon name="sparkle" className="mt-[2px] h-[13px] w-[13px] flex-none text-accent" />
        {action.label}
      </p>

      {editable && status === 'proposed' && (
        <AttendeeEditor attendees={attendees} onChange={setAttendees} disabled={busy} />
      )}

      {status === 'proposed' && (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={confirm}
            className="inline-flex items-center gap-[5px] rounded-[9px] bg-gradient-to-br from-accent to-accent-2 px-[12px] py-[7px] text-[12px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
          >
            <Icon name="check" className="h-[11px] w-[11px]" />
            {busy ? 'Working…' : 'Confirm'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={cancel}
            className="inline-flex items-center gap-[5px] rounded-[9px] border border-line bg-panel px-[12px] py-[7px] text-[12px] font-semibold text-muted transition hover:text-ink disabled:opacity-60"
          >
            Cancel
          </button>
          <span className="text-[10.5px] text-muted">Nothing runs until you confirm.</span>
        </div>
      )}

      {status === 'done' && (
        <p className="m-0 mt-[6px] flex items-start gap-[6px] text-[12px] leading-snug text-green">
          <Icon name="check" className="mt-px h-[12px] w-[12px] flex-none" />
          {result ?? 'Done.'}
        </p>
      )}
      {status === 'failed' && (
        <p className="m-0 mt-[6px] flex items-start gap-[6px] text-[12px] leading-snug text-red">
          <Icon name="close" className="mt-px h-[12px] w-[12px] flex-none" />
          {result ?? 'Could not run this action.'}
        </p>
      )}
      {status === 'cancelled' && (
        <p className="m-0 mt-[6px] text-[12px] text-muted">Cancelled — nothing was changed.</p>
      )}
    </div>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Editable attendee list on a meeting confirmation card (Phase C). Type a name
 * or email — suggestions come from the manager's OWN senders (people table,
 * VIPs first); a full typed email can always be added with Enter. The final
 * list is what Confirm sends — re-validated server-side.
 */
export function AttendeeEditor({
  attendees,
  onChange,
  disabled,
}: {
  attendees: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<AttendeeSuggestion[]>([]);
  const seq = useRef(0); // drop out-of-order suggestion responses

  function add(email: string) {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e) || attendees.includes(e)) return;
    onChange([...attendees, e]);
    setInput('');
    setSuggestions([]);
  }

  function remove(email: string) {
    onChange(attendees.filter((a) => a !== email));
  }

  function onInput(value: string) {
    setInput(value);
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const mySeq = ++seq.current;
    void suggestAttendees(q).then((res) => {
      if (seq.current !== mySeq) return;
      setSuggestions(res.filter((s) => !attendees.includes(s.email)));
    });
  }

  return (
    <div className="mt-2">
      <p className="m-0 mb-[5px] text-[10.5px] font-semibold uppercase tracking-wide text-muted">
        Attendees
      </p>
      <div className="flex flex-wrap items-center gap-[5px]">
        {attendees.map((email) => (
          <span
            key={email}
            className="inline-flex items-center gap-[5px] rounded-full border border-line bg-panel px-[9px] py-[4px] text-[11.5px] font-medium text-ink"
          >
            {email}
            <button
              type="button"
              disabled={disabled}
              onClick={() => remove(email)}
              aria-label={`Remove ${email}`}
              className="grid h-[14px] w-[14px] place-items-center rounded-full border-none bg-panel-2 text-muted transition hover:bg-red-soft hover:text-red"
            >
              <Icon name="close" className="h-[8px] w-[8px]" />
            </button>
          </span>
        ))}
        <input
          value={input}
          disabled={disabled}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(input);
            }
          }}
          placeholder={attendees.length === 0 ? 'Add people (name or email)…' : 'Add more…'}
          aria-label="Add attendee"
          className="min-w-[140px] flex-1 border-none bg-transparent py-[4px] text-[12px] text-ink outline-none placeholder:text-muted"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="mt-[6px] flex flex-col gap-[2px] rounded-[9px] border border-line bg-panel p-[4px]">
          {suggestions.map((s) => (
            <button
              key={s.email}
              type="button"
              disabled={disabled}
              onClick={() => add(s.email)}
              className="flex items-baseline gap-[7px] rounded-[7px] border-none bg-transparent px-[8px] py-[5px] text-left text-[12px] text-ink transition hover:bg-accent-soft"
            >
              {s.name && <b className="font-semibold">{s.name}</b>}
              <span className="text-muted">{s.email}</span>
            </button>
          ))}
        </div>
      )}
      <p className="m-0 mt-[5px] text-[10.5px] text-muted">
        Invites go to exactly this list when you confirm.
      </p>
    </div>
  );
}

export function MessageBubble({ msg }: { msg: ChatMessageView }) {
  const isAi = msg.role === 'assistant';
  return (
    <div className={`flex max-w-[86%] flex-col ${isAi ? 'self-start' : 'self-end'}`}>
      <div
        className={[
          'animate-rise whitespace-pre-wrap rounded-[15px] border border-line px-[14px] py-[11px] text-[13.5px] leading-relaxed text-ink',
          isAi
            ? 'rounded-bl-[5px] bg-[color:var(--chat-bubble-ai)]'
            : 'rounded-br-[5px] bg-[color:var(--chat-bubble-user)]',
        ].join(' ')}
      >
        {msg.content}
      </div>
      {isAi && msg.action && <ActionCard messageId={msg.id} action={msg.action} />}
      {isAi && <LearnedChips learned={msg.learned} />}
    </div>
  );
}

export function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2 self-start rounded-[15px] rounded-bl-[5px] border border-line bg-[color:var(--chat-bubble-ai)] px-[14px] py-[11px]">
      <span className="flex gap-[4px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-[6px] w-[6px] animate-bounce rounded-full bg-accent"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
      <span className="text-[12px] text-muted">Vesta is thinking…</span>
    </div>
  );
}
