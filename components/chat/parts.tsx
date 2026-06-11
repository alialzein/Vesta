'use client';

import Link from 'next/link';
import type { ChatMessageView } from '@/lib/chat/data';
import { Icon } from '@/components/ui/Icon';

/**
 * Shared Ask Vesta chat pieces — used by both the full /chat page (ChatView)
 * and the dashboard's floating mini chat (ChatDock), so the two surfaces stay
 * one product: same bubbles, same learned-memory chips, same starters.
 */

export const CHAT_STARTERS = [
  'What should I focus on right now?',
  "Who's waiting on me?",
  "What's in my briefing today?",
  'Remember that I prefer short, direct emails.',
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
