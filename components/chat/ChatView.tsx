'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteChatConversation, sendChatMessage } from '@/app/actions/chat';
import type { ChatConversationView, ChatData, ChatMessageView } from '@/lib/chat/data';
import { Icon } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';
import { useToast } from '@/components/ui/Toast';

/**
 * Ask Vesta — the full-page chat. The manager talks to Vesta the way they'd
 * think out loud: Vesta answers from their memories, rules, today's workload,
 * and briefing, and shows a "Saved to memory" chip whenever it learned
 * something from the turn (every learned fact lives in Memory & Rules, where
 * it can be deleted).
 *
 * Conversations are listed in a left rail (Link-prefetched, per the nav
 * rule); a brand-new chat creates its conversation on the first send and
 * swaps the URL in place (no refetch, no lost thread).
 */

const STARTERS = [
  'What should I focus on right now?',
  "Who's waiting on me?",
  "What's in my briefing today?",
  'Remember that I prefer short, direct emails.',
];

function LearnedChips({ learned }: { learned: string[] }) {
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

function MessageBubble({ msg }: { msg: ChatMessageView }) {
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

function Thinking() {
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

export function ChatView({ data }: { data: ChatData }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [conversations, setConversations] = useState<ChatConversationView[]>(data.conversations);
  const [activeId, setActiveId] = useState<string | null>(data.activeId);
  const [messages, setMessages] = useState<ChatMessageView[]>(data.messages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Server data changes on conversation navigation — adopt it.
  useEffect(() => {
    setConversations(data.conversations);
    setActiveId(data.activeId);
    setMessages(data.messages);
  }, [data]);

  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

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
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    void sendChatMessage({ conversationId: activeId, text: q })
      .then((res) => {
        if (!res.ok) {
          setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
          setInput(q); // give the manager their words back
          showToast(res.error);
          return;
        }
        setMessages((prev) => [...prev, res.message]);
        if (res.conversationId !== activeId) {
          // First message of a fresh chat: adopt the new conversation without
          // a refetch (the thread is already on screen).
          setActiveId(res.conversationId);
          setConversations((prev) => [
            { id: res.conversationId, title: q.slice(0, 60), lastMessageAt: optimistic.createdAt },
            ...prev,
          ]);
          window.history.replaceState(null, '', `/chat?c=${res.conversationId}`);
        }
      })
      .finally(() => setSending(false));
  }

  function handleDelete(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (id === activeId) {
      setActiveId(null);
      setMessages([]);
      window.history.replaceState(null, '', '/chat');
    }
    void deleteChatConversation(id).then((res) => {
      if (!res.ok) {
        showToast(res.error ?? 'Could not delete the conversation.');
        router.refresh();
      }
    });
  }

  const empty = messages.length === 0 && !sending;

  return (
    <div className="flex min-h-0 flex-1 gap-4">
      {/* Conversation rail (desktop) */}
      <aside className="hidden w-[250px] flex-none flex-col gap-2 lg:flex">
        <Link
          href="/chat"
          prefetch
          onClick={() => {
            setActiveId(null);
            setMessages([]);
          }}
          className="inline-flex items-center justify-center gap-[7px] rounded-[11px] border border-line bg-panel px-3 py-[9px] text-[12.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="chat" className="h-[14px] w-[14px]" />
          New conversation
        </Link>
        <div className="v-scroll flex min-h-0 flex-1 flex-col gap-[6px] overflow-y-auto pr-[2px]">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={[
                'group flex items-center gap-2 rounded-[11px] border px-3 py-[8px] transition',
                c.id === activeId
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-panel hover:border-line-strong',
              ].join(' ')}
            >
              <Link href={`/chat?c=${c.id}`} prefetch className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[12.5px] font-medium ${c.id === activeId ? 'text-accent' : 'text-ink-soft'}`}
                >
                  {c.title}
                </span>
                <LocalTime
                  iso={c.lastMessageAt}
                  className="text-[10.5px] text-muted"
                  options={{ month: 'short', day: 'numeric' }}
                />
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                title="Delete conversation"
                aria-label={`Delete conversation ${c.title}`}
                className="grid h-[22px] w-[22px] flex-none place-items-center rounded-[7px] text-muted opacity-0 transition hover:bg-red-soft hover:text-red group-hover:opacity-100"
              >
                <Icon name="close" className="h-[11px] w-[11px]" />
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <p className="px-2 text-[12px] leading-relaxed text-muted">
              Your conversations will appear here. Vesta remembers what matters from every one.
            </p>
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-[14px] border border-line bg-panel shadow-soft">
        <div ref={bodyRef} className="v-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {empty ? (
            <div className="m-auto flex max-w-[480px] flex-col items-center gap-3 py-10 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
                <Icon name="chat" className="h-6 w-6" />
              </span>
              <h2 className="m-0 font-display text-[18px] font-semibold tracking-tight text-ink">
                Talk to Vesta like you talk to yourself
              </h2>
              <p className="m-0 text-[13px] leading-relaxed text-muted">
                Vesta answers from your inbox, your memories, and today&rsquo;s briefing — and
                quietly learns you with every conversation. Tell it about people, preferences,
                projects; it keeps what matters.
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-[7px]">
                {STARTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-line bg-panel-2 px-[12px] py-[7px] text-[12px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
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
              {sending && <Thinking />}
            </>
          )}
        </div>

        {/* Composer */}
        <div className="flex items-end gap-[9px] border-t border-line bg-panel-2 px-4 py-[12px]">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={Math.min(4, Math.max(1, input.split('\n').length))}
            placeholder="Ask anything — or tell Vesta something worth remembering…"
            aria-label="Message Vesta"
            className="v-scroll max-h-[120px] flex-1 resize-none border-none bg-transparent text-[13.5px] leading-relaxed text-ink outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={() => send(input)}
            disabled={sending || !input.trim()}
            aria-label="Send message"
            className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px] border-none bg-gradient-to-br from-accent to-accent-2 shadow-[0_6px_16px_rgba(47,125,235,0.4)] transition hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            <Icon name="send" className="h-[18px] w-[18px] text-white" />
          </button>
        </div>
      </section>
    </div>
  );
}
