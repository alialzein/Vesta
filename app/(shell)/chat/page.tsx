import { requireUser } from '@/lib/supabase/auth';
import { getChatData } from '@/lib/chat/data';
import { ChatView } from '@/components/chat/ChatView';

export const dynamic = 'force-dynamic';

/**
 * Ask Vesta (sidebar → Intelligence → Ask Vesta, and the dashboard's floating
 * button) — the manager's second brain as a full chat page. Vesta answers
 * from their memories, rules, today's workload, and briefing; what it learns
 * each turn is saved to Memory & Rules (source 'chat'). Renders inside the
 * AppShell; ?c=<id> opens a stored conversation.
 */
export default async function ChatPage({
  searchParams,
}: {
  searchParams?: { c?: string };
}) {
  await requireUser();
  const data = await getChatData(searchParams?.c ?? null);
  return <ChatView data={data} />;
}
