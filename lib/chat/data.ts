import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

/**
 * Ask Vesta chat — shared shapes + the page loader. (Kept out of the actions
 * file: 'use server' modules may only export async functions.)
 */

export type ChatActionKind =
  | 'mark_done'
  | 'snooze'
  | 'create_task'
  | 'draft_reply'
  | 'create_reminder';
export type ChatActionStatus = 'proposed' | 'done' | 'failed' | 'cancelled';

const ACTION_KINDS: ChatActionKind[] = [
  'mark_done',
  'snooze',
  'create_task',
  'draft_reply',
  'create_reminder',
];
const ACTION_STATUSES: ChatActionStatus[] = ['proposed', 'done', 'failed', 'cancelled'];

/** A chat-order proposal as stored on the assistant message
 *  (chat_messages.metadata.action). Nothing runs until the manager confirms. */
export type StoredChatAction = {
  kind: ChatActionKind;
  status: ChatActionStatus;
  /** Human-readable line for the confirmation card. */
  label: string;
  /** Manager timezone at proposal time (local times resolve against it). */
  tz: string;
  item_id: string | null;
  item_title: string | null;
  until_local: string | null;
  task_title: string | null;
  due_local: string | null;
  instruction: string | null;
  /** create_reminder fields (Phase B). */
  reminder_subject?: string | null;
  to_email?: string | null;
  first_at_local?: string | null;
  repeat_minutes?: number | null;
  send_count?: number | null;
  /** Result line after execution (or the failure reason). */
  result?: string | null;
};

export type ChatActionView = {
  kind: ChatActionKind;
  status: ChatActionStatus;
  label: string;
  result: string | null;
};

export type ChatMessageView = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Facts Vesta saved to Memory & Rules from this turn. */
  learned: string[];
  /** A proposed/settled chat order attached to this turn, when any. */
  action: ChatActionView | null;
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

  let action: ChatActionView | null = null;
  const a = meta.action as Partial<StoredChatAction> | null | undefined;
  if (
    a &&
    typeof a === 'object' &&
    ACTION_KINDS.includes(a.kind as ChatActionKind) &&
    ACTION_STATUSES.includes(a.status as ChatActionStatus) &&
    typeof a.label === 'string'
  ) {
    action = {
      kind: a.kind as ChatActionKind,
      status: a.status as ChatActionStatus,
      label: a.label,
      result: typeof a.result === 'string' ? a.result : null,
    };
  }

  return {
    id: r.id,
    role: r.role === 'assistant' ? 'assistant' : 'user',
    content: r.content,
    learned,
    action,
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
