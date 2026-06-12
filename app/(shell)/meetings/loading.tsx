import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant content-column skeleton while the Outlook calendar is fetched. */
export default function Loading() {
  return <PageSkeleton inShell rows={4} />;
}
