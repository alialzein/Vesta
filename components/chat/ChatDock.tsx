'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { sendChatMessage } from '@/app/actions/chat';
import type { ChatMessageView } from '@/lib/chat/data';
import { CHAT_STARTERS, MessageBubble, ThinkingIndicator } from './parts';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/**
 * Ask Vesta as a floating mini chat on the dashboard (opened by the
 * bottom-right button / collapsed-rail chat icon). Deliberately NON-modal:
 * no backdrop, so Today's Radar stays visible and clickable while talking —
 * ask "who's waiting on me?", then act on the items right behind the panel.
 *
 * Same real backend as the full /chat page (one conversation per dock
 * session, it appears in the /chat history); the expand button jumps to the
 * full view with the thread intact. The component stays mounted while the
 * dock is closed so reopening keeps the conversation.
 */
export function ChatDock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, open]);

  // Close on Escape (but never block clicks behind the panel).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function send(text: string) {
    const q = text.trim();
    if (!q || sending) return;
    setInput('');
    setSending(true);
    const optimistic: ChatMessageView = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: q,
      learned: [],
      action: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    void sendChatMessage({ conversationId, text: q })
      .then((res) => {
        if (!res.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          setInput(q);
          showToast(res.error);
          return;
        }
        setConversationId(res.conversationId);
        setMessages((prev) => [...prev, res.message]);
      })
      .finally(() => setSending(false));
  }

  return (
    <section
      role="complementary"
      aria-label="Vesta mini chat"
      aria-hidden={!open}
      className={[
        'fixed bottom-6 right-6 z-[60] flex h-[560px] max-h-[78vh] w-[400px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-[18px] border border-line bg-panel-solid shadow-panel transition-all duration-300 ease-ease',
        open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0',
      ].join(' ')}
    >
      {/* Head */}
      <div className="flex items-center gap-[10px] border-b border-line px-4 py-3">
        <div className="relative h-8 w-8 flex-none rounded-[10px] bg-[radial-gradient(circle_at_50%_95%,#43c7ff,#2f7deb_50%,var(--accent-2))] shadow-[0_6px_18px_rgba(47,125,235,.5)]" />
        <div className="min-w-0">
          <b className="block font-display text-[14px] font-semibold leading-tight text-ink">Vesta</b>
          <small className="block truncate text-[10.5px] font-semibold text-green">
            ● Online — your radar stays clickable behind me
          </small>
        </div>
        <Link
          href={conversationId ? `/chat?c=${conversationId}` : '/chat'}
          prefetch
          title="Open the full chat view"
          aria-label="Open full chat view"
          className="ml-auto grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-panel-2 text-muted transition hover:bg-accent-soft hover:text-accent"
        >
          <Icon name="panelRight" className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={onClose}
          title="Close mini chat"
          aria-label="Close mini chat"
          className="grid h-[30px] w-[30px] place-items-center rounded-[9px] border-none bg-panel-2 text-muted transition hover:bg-red-soft hover:text-red"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>

      {/* Body */}
      <div ref={bodyRef} className="v-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && !sending ? (
          <div className="m-auto flex flex-col items-center gap-2 text-center">
            <p className="m-0 text-[12.5px] leading-relaxed text-muted">
              Quick questions or orders while you work — Vesta knows your radar, memory, and
              briefing, and asks you to confirm before any action runs.
            </p>
            <div className="flex flex-wrap justify-center gap-[6px]">
              {CHAT_STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-line bg-panel-2 px-[10px] py-[6px] text-[11.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
            {sending && <ThinkingIndicator />}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="flex items-center gap-[8px] border-t border-line bg-panel-2 px-3 py-[10px]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') send(input);
          }}
          placeholder="Ask Vesta anything…"
          aria-label="Message Vesta"
          className="flex-1 border-none bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          onClick={() => send(input)}
          disabled={sending || !input.trim()}
          aria-label="Send message"
          className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] border-none bg-gradient-to-br from-accent to-accent-2 shadow-[0_6px_16px_rgba(47,125,235,0.4)] transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
        >
          <Icon name="send" className="h-4 w-4 text-white" />
        </button>
      </div>
    </section>
  );
}
