import { requireUser } from '@/lib/supabase/auth';
import { getMeetingsData } from '@/lib/meetings/data';
import { MeetingsView } from '@/components/meetings/MeetingsView';

export const dynamic = 'force-dynamic';

/**
 * Meetings (v1) — the manager's real Outlook schedule for today + the next
 * 7 days, with Join links and "Prep with Vesta" (Phase 12 Meeting Prep).
 * Renders inside the AppShell (sidebar + topbar provide nav and the title).
 */
export default async function MeetingsPage() {
  await requireUser();
  const data = await getMeetingsData();
  return <MeetingsView data={data} />;
}
