import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant content-column skeleton while Weekly Review aggregates the week. */
export default function Loading() {
  return <PageSkeleton inShell rows={4} rowHeight={120} />;
}
