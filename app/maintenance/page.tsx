import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isMaintenanceOn } from '@/lib/admin/maintenance';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

/**
 * The "back soon" screen normal users see while the operator has maintenance
 * mode on (requireUser routes them here). Deliberately does NOT use
 * requireUser itself (that would loop); when the switch is off again, any
 * visit bounces straight back into the app. Theme-aware, both modes.
 */
export default async function MaintenancePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.app_metadata?.is_admin === true) redirect('/admin');
  if (!(await isMaintenanceOn())) redirect('/');

  return (
    <main className="grid h-[100dvh] place-items-center bg-bg px-4 text-ink">
      <div className="w-full max-w-[440px] rounded-[18px] border border-line bg-panel p-8 text-center shadow-panel">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
          <Icon name="settings" className="h-7 w-7 animate-vesta-pulse" />
        </span>
        <h1 className="mt-4 font-display text-[22px] font-semibold tracking-tight">
          Vesta is being tuned up
        </h1>
        <p className="mx-auto mt-2 max-w-[360px] text-[13.5px] leading-relaxed text-muted">
          We&apos;re doing brief maintenance and will be back shortly. Your mail keeps syncing in
          the background — nothing is lost, and your radar will be exactly where you left it.
        </p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
          — The Vesta operator
        </p>
      </div>
    </main>
  );
}
