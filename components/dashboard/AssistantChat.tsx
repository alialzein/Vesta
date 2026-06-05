'use client';

import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from '@/lib/types';
import { demoChat, demoChatReplies, demoChatSuggestions } from '@/lib/demo-data';
import { Icon } from '@/components/ui/Icon';

let nextId = 1000;

/** Look up a canned reply; fall back to a generic acknowledgement. */
function mockReply(question: string): string {
  const key = question.toLowerCase().replace(/[?.!]/g, '').trim();
  return (
    demoChatReplies[key] ??
    `Got it — I&apos;ll work on &ldquo;${question}&rdquo;. (Demo mode: a model endpoint is wired in a later phase.)`
  );
}

type AssistantChatProps = {
  onClose: () => void;
};

export function AssistantChat({ onClose }: AssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(demoChat);
  const [input, setInput] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function ask(question: string) {
    const q = question.trim();
    if (!q) return;
    setMessages((prev) => [...prev, { id: `chat-${nextId++}`, author: 'user', html: q }]);
    // Demo: respond after a short delay. Replaced by a real call later.
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: `chat-${nextId++}`, author: 'ai', html: mockReply(q) },
      ]);
    }, 600);
  }

  function send() {
    ask(input);
    setInput('');
  }

  return (
    <div className="flex min-h-[380px] flex-1 flex-col overflow-hidden rounded-[var(--radius)] border border-line bg-panel shadow-glow backdrop-blur-[16px]">
      {/* Head */}
      <div className="flex items-center gap-[11px] border-b border-line px-[18px] py-[13px] pt-4">
        <div className="relative h-8 w-8 flex-none rounded-[10px] bg-[radial-gradient(circle_at_50%_95%,#67e8d8,#5ba8f5_50%,var(--accent-2))] shadow-[0_6px_18px_rgba(91,168,245,.5)]" />
        <div>
          <b className="font-display text-[15px] font-semibold">Vesta</b>
          <small className="block text-[11px] font-semibold text-green">
            ● Online · keeping things in order
          </small>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Hide assistant"
          aria-label="Hide assistant"
          className="ml-auto grid h-[30px] w-[30px] place-items-center rounded-[9px] border-none bg-panel-2 text-muted transition hover:bg-red-soft hover:text-red"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        className="v-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-[18px] py-4"
      >
        {messages.map((m) => (
          <div
            key={m.id}
            className={[
              'animate-rise max-w-[86%] rounded-[15px] border border-line px-[14px] py-[11px] text-[13px] leading-normal [&_b]:text-accent',
              m.author === 'ai'
                ? 'self-start rounded-bl-[5px] bg-[color:var(--chat-bubble-ai)] text-ink'
                : 'self-end rounded-br-[5px] bg-[color:var(--chat-bubble-user)] text-ink',
            ].join(' ')}
            dangerouslySetInnerHTML={{ __html: m.html }}
          />
        ))}
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-[7px] px-[18px] pb-[11px]">
        {demoChatSuggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => ask(s)}
            className="rounded-full border border-line bg-panel-2 px-[11px] py-[6px] text-[11.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex items-center gap-[9px] border-t border-line bg-panel-2 px-4 py-[13px]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send();
          }}
          placeholder="Ask the assistant anything…"
          aria-label="Message the assistant"
          className="flex-1 border-none bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={send}
          aria-label="Send message"
          className="grid h-[38px] w-[38px] place-items-center rounded-[11px] border-none bg-gradient-to-br from-accent to-accent-2 shadow-[0_6px_16px_rgba(74,111,165,0.4)] transition hover:scale-105"
        >
          <Icon name="send" className="h-[18px] w-[18px] text-white" />
        </button>
      </div>
    </div>
  );
}
