'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { cancelChatAction, executeChatAction } from '@/app/actions/chat';
import { suggestAttendees, type AttendeeSuggestion } from '@/app/actions/people';
import type { ChatActionStatus, ChatActionView, ChatMessageView } from '@/lib/chat/data';
import { applyMention, mentionQuery } from '@/lib/chat/mention';
import { Icon } from '@/components/ui/Icon';

/**
 * Shared Ask Vesta chat pieces — used by both the full /chat page (ChatView)
 * and the dashboard's floating mini chat (ChatDock), so the two surfaces stay
 * one product: same bubbles, same learned-memory chips, same starters, same
 * chat-order confirmation cards.
 */

/** Questions — tapping one sends it as-is. Kept to the four highest-value. */
export const CHAT_ASK_STARTERS = [
  'What should I focus on right now?',
  "Who's waiting on me?",
  'What meetings do I have today?',
  "What's in my briefing today?",
];

/** Orders — tapping one PREFILLS the composer so the manager completes the
 *  details (who/when), then sends. Every order ends in a Confirm card. The
 *  meeting prefill ends in "@" on purpose: typing a name straight into the
 *  people autocomplete. */
export const CHAT_ACTION_STARTERS: { label: string; prefill: string }[] = [
  { label: 'Schedule a meeting…', prefill: 'Schedule a 30-minute meeting with @' },
  { label: 'Remind me…', prefill: 'Remind me to ' },
  { label: 'Draft a reply…', prefill: 'Draft a reply to my most urgent email.' },
];

/** Everything Vesta can do, in the manager's words — lives behind the
 *  "What can Vesta do?" toggle (tap-friendly; hover doesn't exist on phones). */
const CAPABILITIES: { heading: string; lines: string[] }[] = [
  {
    heading: 'Ask about your world',
    lines: [
      '“What should I focus on right now?” — your radar, ranked',
      '“Who’s waiting on me?” / “What meetings do I have today?”',
      '“What’s in my briefing today?” — your news, summarized',
    ],
  },
  {
    heading: 'Give orders — you always confirm first',
    lines: [
      '“Schedule a 30-minute meeting with @name tomorrow at 10am” — invites + link, and a reminder email 15 min before',
      '“Email me a reminder about my top item at 5pm” (once or repeating)',
      '“Snooze my top item until Monday 9am” / “Mark it done” / “Add a task…”',
      '“Draft a reply to my most urgent email” — lands in Draft Replies for your approval',
    ],
  },
  {
    heading: 'Teach it',
    lines: [
      '“Remember that I prefer short, direct emails” — saved to Memory & Rules, used in every ranking and draft',
    ],
  },
];

/**
 * The empty-state starter board, shared by both chat surfaces: four questions
 * that send on tap, three orders that prefill the composer, and the expandable
 * "What can Vesta do?" capability list.
 */
export function StarterBoard({
  onSend,
  onPrefill,
}: {
  onSend: (text: string) => void;
  onPrefill: (text: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const chip =
    'rounded-full border border-line bg-panel-2 px-[12px] py-[7px] text-[12px] font-semibold transition hover:border-accent hover:text-accent';
  return (
    <div className="flex w-full flex-col items-center gap-[10px]">
      <div className="flex flex-wrap justify-center gap-[7px]">
        {CHAT_ASK_STARTERS.map((s) => (
          <button key={s} type="button" onClick={() => onSend(s)} className={`${chip} text-ink-soft`}>
            {s}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-[7px]">
        {CHAT_ACTION_STARTERS.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() => onPrefill(a.prefill)}
            className={`${chip} inline-flex items-center gap-[5px] text-accent`}
          >
            <Icon name="sparkle" className="h-[11px] w-[11px]" />
            {a.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        aria-expanded={showAll}
        className="border-none bg-transparent text-[11.5px] font-semibold text-muted underline-offset-2 transition hover:text-accent hover:underline"
      >
        {showAll ? 'Hide the full list' : 'What can Vesta do?'}
      </button>
      {showAll && (
        <div className="w-full max-w-[440px] rounded-[12px] border border-line bg-panel-2 p-3 text-left">
          {CAPABILITIES.map((group) => (
            <div key={group.heading} className="mb-[10px] last:mb-0">
              <p className="m-0 mb-[4px] text-[10.5px] font-semibold uppercase tracking-[0.07em] text-accent">
                {group.heading}
              </p>
              <ul className="m-0 flex list-none flex-col gap-[3px] p-0">
                {group.lines.map((line) => (
                  <li key={line} className="flex gap-[7px] text-[11.5px] leading-snug text-ink-soft">
                    <span
                      className="mt-[6px] h-[4px] w-[4px] flex-none rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * @-mention people autocomplete for the chat composer. Watches the input
 * value for a trailing "@name" and fetches suggestions from the manager's own
 * senders; `accept` swaps the token for the chosen email. Render the returned
 * suggestions with <MentionMenu> just above the composer.
 */
export function useAttendeeMention(value: string, setValue: (v: string) => void) {
  const [suggestions, setSuggestions] = useState<AttendeeSuggestion[]>([]);
  const seq = useRef(0);
  const q = mentionQuery(value);
  const query = q?.query ?? null;

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const mySeq = ++seq.current;
    void suggestAttendees(query).then((res) => {
      if (seq.current === mySeq) setSuggestions(res);
    });
  }, [query]);

  function accept(email: string) {
    const live = mentionQuery(value);
    if (live) setValue(applyMention(value, live, email));
    setSuggestions([]);
  }

  return { suggestions: q ? suggestions : [], accept };
}

/** The floating people menu fed by useAttendeeMention — absolutely positioned
 *  by the parent (wrap the composer in `relative`). */
export function MentionMenu({
  suggestions,
  onPick,
}: {
  suggestions: AttendeeSuggestion[];
  onPick: (email: string) => void;
}) {
  if (suggestions.length === 0) return null;
  return (
    <div className="absolute bottom-full left-3 right-3 z-10 mb-[6px] flex flex-col gap-[2px] rounded-[11px] border border-line bg-panel-solid p-[4px] shadow-panel">
      <p className="m-0 px-[8px] pt-[4px] text-[10px] font-semibold uppercase tracking-[0.07em] text-muted">
        People from your mail
      </p>
      {suggestions.map((s) => (
        <button
          key={s.email}
          type="button"
          onMouseDown={(e) => e.preventDefault() /* keep composer focus */}
          onClick={() => onPick(s.email)}
          className="flex items-baseline gap-[7px] rounded-[8px] border-none bg-transparent px-[8px] py-[6px] text-left text-[12.5px] text-ink transition hover:bg-accent-soft"
        >
          {s.name && <b className="font-semibold">{s.name}</b>}
          <span className="truncate text-muted">{s.email}</span>
        </button>
      ))}
    </div>
  );
}

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
  const [link, setLink] = useState<string | null>(action.link);
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
          setLink(res.link ?? null);
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
        <>
          <p className="m-0 mt-[6px] flex items-start gap-[6px] text-[12px] leading-snug text-green">
            <Icon name="check" className="mt-px h-[12px] w-[12px] flex-none" />
            {result ?? 'Done.'}
          </p>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="mt-[7px] inline-flex items-center gap-[6px] rounded-[9px] bg-gradient-to-br from-accent to-accent-2 px-[12px] py-[7px] text-[12px] font-semibold text-white transition hover:brightness-110"
            >
              <Icon name="calendar" className="h-[12px] w-[12px]" />
              Open the meeting link
            </a>
          )}
        </>
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
  caption = 'Invites go to exactly this list when you confirm.',
}: {
  attendees: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  /** The footnote under the list (the thread Forward panel overrides it). */
  caption?: string;
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
      <p className="m-0 mt-[5px] text-[10.5px] text-muted">{caption}</p>
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
