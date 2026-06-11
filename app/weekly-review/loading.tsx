import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant skeleton while the Weekly Review server component aggregates the week. */
export default function Loading() {
  return <PageSkeleton maxWidth="820px" rows={4} rowHeight={120} />;
}
