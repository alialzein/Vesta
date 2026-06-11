import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant content-column skeleton while the Briefing loads today's items. */
export default function Loading() {
  return <PageSkeleton inShell rows={5} rowHeight={120} />;
}
