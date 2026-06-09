import { AdminSkeleton } from '@/components/admin/AdminSkeleton';

export default function Loading() {
  return <AdminSkeleton kpis={0} rows={10} />;
}
