import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant content-column skeleton while the Drafts page fetches saved drafts. */
export default function Loading() {
  return <PageSkeleton inShell rows={5} />;
}
