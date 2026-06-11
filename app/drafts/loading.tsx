import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant skeleton while the Drafts server component fetches saved drafts. */
export default function Loading() {
  return <PageSkeleton maxWidth="820px" rows={5} />;
}
