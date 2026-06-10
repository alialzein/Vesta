import { requireAdmin } from '@/lib/admin/auth';
import { getAppSettings } from '@/lib/admin/settings';
import { getStorageByUser } from '@/lib/admin/data';
import { Section, KpiCard, EmptyState } from '@/components/admin/ui';
import { RetentionSettings } from '@/components/admin/tabs/RetentionSettings';
import { StorageTable } from '@/components/admin/tabs/StorageTable';
import { fmtInt, fmtDate } from '@/lib/admin/format';

export default async function AdminEmailPage() {
  await requireAdmin();
  const [settings, storage] = await Promise.all([getAppSettings(), getStorageByUser()]);
  const t = storage.totals;

  return (
    <div>
      <header className="mb-6">
        <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
          Email &amp; Retention
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Stored mail grows forever unless purged. Set the policy, then purge soft-deleted mail or
          apply the retention window.
        </p>
      </header>

      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Stored messages" value={fmtInt(t.total)} />
        <KpiCard label="Hidden (filtered)" value={fmtInt(t.hidden)} hint="excluded as noise" />
        <KpiCard label="Soft-deleted" value={fmtInt(t.softDeleted)} hint="removed in Outlook" tone={t.softDeleted > 0 ? 'warn' : 'default'} />
        <KpiCard label="Oldest message" value={fmtDate(t.oldest)} />
      </div>

      <Section title="Retention policy" hint="Global defaults. Per-user overrides come from the Users tab.">
        <RetentionSettings
          scanBack={settings.initial_scan_back_days}
          retentionMonths={settings.retention_months}
          graceDays={settings.soft_delete_grace_days}
        />
      </Section>

      <Section title="Storage by user" hint="Spot a runaway mailbox; wipe a user's synced mail (keeps their connection).">
        {storage.rows.length === 0 ? (
          <EmptyState>No mail stored yet.</EmptyState>
        ) : (
          <StorageTable rows={storage.rows} />
        )}
      </Section>
    </div>
  );
}
