import { requireAdmin } from '@/lib/admin/auth';
import { getAppSettings } from '@/lib/admin/settings';
import { createServiceClient } from '@/lib/supabase/service';
import { MAX_ADMIN_SESSION_HOURS } from '@/lib/admin/session';
import { Section, Panel, Badge, EmptyState } from '@/components/admin/ui';
import {
  ChangePasswordCard,
  MaintenanceSwitch,
  TwoFactorCard,
} from '@/components/admin/tabs/AdminAccountCards';
import { fmtRel } from '@/lib/admin/format';

/**
 * Admin Settings — the SUPER ADMIN's own page. This account is an operator,
 * not a user: it never appears in Users & Accounts, has no mailbox or
 * memories, and everything here is about controlling the system — identity
 * (password, optional two-factor), the maintenance switch, and the admin's
 * own action trail. Changing WHICH account is admin stays a backend step
 * (scripts/grant-admin.mjs or Supabase → app_metadata.is_admin).
 */
export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const svc = createServiceClient();
  const [settings, { data: activity }] = await Promise.all([
    getAppSettings(),
    svc
      .from('audit_logs')
      .select('id, created_at, action, entity_type, metadata')
      .eq('actor_id', admin.id)
      .order('created_at', { ascending: false })
      .limit(15),
  ]);
  const maintenanceOn =
    ((settings.feature_flags ?? {}) as Record<string, unknown>).maintenance === true;

  return (
    <div>
      <header className="mb-6">
        <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
          Admin Settings
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          The operator account itself — identity, protection, and the system switch. This account
          is not a user: it has no mailbox, no radar, and never appears in Users &amp; Accounts.
        </p>
      </header>

      <Section title="Operator account" hint={`Sessions expire after ${MAX_ADMIN_SESSION_HOURS}h by design.`}>
        <Panel className="p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
            <span>
              <span className="text-muted">Signed in as </span>
              <b className="font-semibold text-ink">{admin.email}</b>
            </span>
            <span className="text-muted">
              Last sign-in {fmtRel(admin.last_sign_in_at ?? null)}
            </span>
            <Badge tone="accent">super admin</Badge>
          </div>
          <p className="mb-0 mt-2 text-[12px] leading-relaxed text-muted">
            To move admin rights to a different email later: run{' '}
            <code className="rounded bg-panel-2 px-1 py-[1px] font-mono text-[11px]">
              node scripts/grant-admin.mjs new@email
            </code>{' '}
            and clear <code className="rounded bg-panel-2 px-1 py-[1px] font-mono text-[11px]">is_admin</code>{' '}
            on this one in Supabase.
          </p>
        </Panel>
      </Section>

      <Section title="Password" hint="Changes apply immediately to this operator account.">
        <Panel className="p-4">
          <ChangePasswordCard />
        </Panel>
      </Section>

      <Section
        title="Two-factor authentication"
        hint="Authenticator app (TOTP). Optional — requires TOTP enabled in Supabase → Authentication → Multi-Factor."
      >
        <Panel className="p-4">
          <TwoFactorCard />
        </Panel>
      </Section>

      <Section
        title="Maintenance mode"
        hint="Locks the app for normal users (they see a “back soon” screen). The console stays open; sync keeps running."
      >
        <Panel className="p-4">
          <MaintenanceSwitch initialOn={maintenanceOn} />
        </Panel>
      </Section>

      <Section title="Your recent admin actions" hint="From the audit log — what this account changed lately.">
        {(activity ?? []).length === 0 ? (
          <EmptyState>No admin actions recorded yet.</EmptyState>
        ) : (
          <Panel className="p-0">
            <ul className="divide-y divide-line/60">
              {(activity ?? []).map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-[10px]">
                  <Badge tone="accent">{a.action}</Badge>
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-soft">
                    {a.entity_type ?? ''}
                  </span>
                  <span className="flex-none text-[11.5px] text-muted">{fmtRel(a.created_at)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </Section>
    </div>
  );
}
