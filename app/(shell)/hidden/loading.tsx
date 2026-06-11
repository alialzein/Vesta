import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant content-column skeleton while the Hidden review fetches mail. */
export default function Loading() {
  return <PageSkeleton inShell rows={6} />;
}
