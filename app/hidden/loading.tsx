import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant skeleton while the Hidden review server component fetches mail. */
export default function Loading() {
  return <PageSkeleton maxWidth="820px" rows={6} />;
}
