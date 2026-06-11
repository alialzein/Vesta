import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant content-column skeleton while Settings fetches the Outlook state. */
export default function Loading() {
  return <PageSkeleton inShell rows={3} rowHeight={150} />;
}
