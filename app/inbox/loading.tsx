import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant skeleton while the Inbox server component fetches synced mail. */
export default function Loading() {
  return <PageSkeleton maxWidth="820px" rows={6} />;
}
