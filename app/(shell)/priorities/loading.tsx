import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant content-column skeleton while Waiting on Me fetches work items. */
export default function Loading() {
  return <PageSkeleton inShell rows={5} />;
}
