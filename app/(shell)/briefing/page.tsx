import { requireUser } from '@/lib/supabase/auth';
import { getBriefingData } from '@/lib/briefing/data';
import { BriefingView } from '@/components/briefing/BriefingView';

export const dynamic = 'force-dynamic';

/**
 * Personal Intelligence Brief (sidebar → Intelligence → Briefing) — a short,
 * personalized daily briefing built from the manager's chosen topics and
 * tracked companies. Lives on its own page by design: news NEVER appears
 * above Today's Radar (see docs/plans/personal-intelligence-brief-plan.md).
 * Renders inside the AppShell.
 */
export default async function BriefingPage() {
  await requireUser();
  const data = await getBriefingData();
  return <BriefingView data={data} />;
}
