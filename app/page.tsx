import { DashboardClient } from '@/components/dashboard/DashboardClient';

/**
 * Phase 0 dashboard shell.
 *
 * Renders the Arctic Frost command center from demo data only.
 * Later phases replace lib/demo-data.ts with Supabase-backed queries and
 * may move data loading into this server component.
 */
export default function DashboardPage() {
  return <DashboardClient />;
}
