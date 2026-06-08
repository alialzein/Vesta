import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant skeleton while Settings fetches the Outlook + triage state. */
export default function Loading() {
  return <PageSkeleton maxWidth="760px" rows={3} rowHeight={150} />;
}
