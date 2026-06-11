import { PageSkeleton } from '@/components/ui/PageSkeleton';

/** Instant theme-aware skeleton for Ask Vesta (nav rule: no frozen screens). */
export default function ChatLoading() {
  return <PageSkeleton inShell rows={4} rowHeight={72} />;
}
