import type { ReactNode } from 'react';
import { requireAdmin } from '@/lib/admin/auth';
import { AdminShell } from '@/components/admin/AdminShell';

// Always re-verify admin + read fresh operator data (never cache the console).
export const dynamic = 'force-dynamic';

/**
 * Operator-console layout. `requireAdmin()` 404s any non-admin before the shell
 * or any child page renders, so /admin is invisible to normal users. The shell
 * provides the rail/topbar/splash and inherits the app theme (light + dark).
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'dev';
  return (
    <AdminShell adminEmail={admin.email ?? null} env={env}>
      {children}
    </AdminShell>
  );
}
