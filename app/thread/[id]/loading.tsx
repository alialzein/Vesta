import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant skeleton while the thread's messages load. */
export default function Loading() {
  return <PageSkeleton maxWidth="860px" rows={3} rowHeight={160} />;
}
