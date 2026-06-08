import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant skeleton while Priorities (Waiting on Me) fetches work items. */
export default function Loading() {
  return <PageSkeleton maxWidth="820px" rows={5} />;
}
