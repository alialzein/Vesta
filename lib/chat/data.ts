import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

/**
 * Ask Vesta chat — shared shapes + the page loader. (Kept out of the actions
 * file: 'use server' modules may only export async functions.)
 */

export type ChatMessageView = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Facts Vesta saved to Memory & Rules from this turn. */
  learned: string[];
  createdAt: string;
};

export type ChatConversationView = {
  id: string;
  title: string;
  lastMessageAt: string;
};

export type ConversationRow = Database['public']['Tables']['chat_conversations']['Row'];
export type MessageRow = Database['public']['Tables']['chat_messages']['Row'];

export function toMessageView(r: MessageRow): ChatMessageView {
  const meta = (r.metadata ?? {}) as Record<string, unknown>;
  const learned = Array.isArray(meta.learned)
    ? (meta.learned as unknown[]).filter((x): x is string => typeof x === 'string')
    : [];
  return {
    id: r.id,
    role: r.role === 'assistant' ? 'assistant' : 'user',
    content: r.content,
    learned,
    createdAt: r.created_at,
  };
}

export type ChatData = {
  conversations: ChatConversationView[];
  /** The open conversation (from ?c=…), or null for a fresh chat. */
  activeId: string | null;
  messages: ChatMessageView[];
};

/** Everything the Chat page needs (RLS-scoped). `conversationId` comes from
 *  the ?c= search param; unknown ids just yield a fresh chat. */
export async function getChatData(conversationId?: string | null): Promise<ChatData> {
  const supabase = createClient();
  const { data: convRows } = await supabase
    .from('chat_conversations')
    .select('id, title, last_message_at')
    .order('last_message_at', { ascending: false })
    .limit(30);

  const conversations = (convRows ?? []).map((c) => ({
    id: c.id,
    title: c.title,
    lastMessageAt: c.last_message_at,
  }));

  const activeId = conversationId && conversations.some((c) => c.id === conversationId)
    ? conversationId
    : null;

  let messages: ChatMessageView[] = [];
  if (activeId) {
    const { data: msgRows } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', activeId)
      .order('created_at', { ascending: true })
      .limit(200);
    messages = ((msgRows ?? []) as MessageRow[]).map(toMessageView);
  }

  return { conversations, activeId, messages };
}
