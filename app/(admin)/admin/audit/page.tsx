import { requireAdmin } from '@/lib/admin/auth';
import { listAuditLogs, getSecretsStatus, listUsers } from '@/lib/admin/data';
import { Section, Badge, EmptyState, Panel } from '@/components/admin/ui';
import { AuditTable } from '@/components/admin/tabs/AuditTable';
import { fmtRel } from '@/lib/admin/format';

export default async function AdminAuditPage() {
  await requireAdmin();
  const [logs, secrets, users] = await Promise.all([
    listAuditLogs({ limit: 500 }),
    Promise.resolve(getSecretsStatus()),
    listUsers(),
  ]);
  const admins = users.filter((u) => u.isAdmin);

  return (
    <div>
      <header className="mb-6">
        <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
          Audit &amp; Security
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          Who did what — logins, sent replies, failed sends, and every operator action — plus
          secrets status and who holds admin access.
        </p>
      </header>

      <Section title="Secrets & configuration" hint="Presence only — values are never shown.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {secrets.map((s) => (
            <div key={s.key} className="flex items-center justify-between rounded-[12px] border border-line bg-panel px-4 py-3">
              <div>
                <div className="text-[13px] font-medium text-ink">{s.label}</div>
                <div className="font-mono text-[10.5px] text-muted">{s.key}</div>
              </div>
              {s.configured ? <Badge tone="good">set</Badge> : <Badge tone="bad">missing</Badge>}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-muted">
          Rotate secrets periodically (especially before launch). A “missing” item won&apos;t work
          on this deployment until it&apos;s set in the environment.
        </p>
      </Section>

      <Section title="Admins" hint="Accounts with operator-console access.">
        {admins.length === 0 ? (
          <EmptyState>No admins.</EmptyState>
        ) : (
          <Panel className="p-0">
            <ul className="divide-y divide-line/60">
              {admins.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Badge tone="accent">admin</Badge>
                  <span className="text-[13px] text-ink">{a.email ?? a.id}</span>
                  <span className="ml-auto text-[11.5px] text-muted">last sign-in {fmtRel(a.lastSignInAt)}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </Section>

      <Section
        title="Audit log"
        hint="Latest 500 events — logins, email sends/failures, and every mutating operator action. Search and filter freely."
      >
        {logs.length === 0 ? (
          <EmptyState>No audit entries yet.</EmptyState>
        ) : (
          <AuditTable logs={logs} />
        )}
      </Section>
    </div>
  );
}
