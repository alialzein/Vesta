import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant content-column skeleton while the Inbox fetches synced mail. */
export default function Loading() {
  return <PageSkeleton inShell rows={6} />;
}
