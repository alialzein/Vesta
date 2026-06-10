import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin/auth';
import { getUserDetail } from '@/lib/admin/data';
import { Section, Panel, KpiCard, Badge, Table, Th, Td, EmptyState } from '@/components/admin/ui';
import { UserRowActions } from '@/components/admin/tabs/UserRowActions';
import { TimezoneEditor } from '@/components/admin/tabs/TimezoneEditor';
import { RetriggerOnboardingButton } from '@/components/admin/tabs/RetriggerOnboardingButton';
import { fmtInt, fmtRel, fmtDate, fmtDateTime, fmtUsd } from '@/lib/admin/format';

/**
 * Per-user history & control page (Wave 3). Everything about one account in one
 * place: identity, timezone, mailbox/sync state, usage counts, recent drafts,
 * AI spend, and the audit trail (logins, sends, admin actions on them).
 */
export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  const d = await getUserDetail(params.id);
  if (!d) notFound();

  const stateBadge = d.profile.suspended ? (
    <Badge tone="bad">suspended</Badge>
  ) : d.profile.onboardedAt ? (
    <Badge tone="good">active</Badge>
  ) : (
    <Badge tone="warn">onboarding</Badge>
  );

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/admin/users"
          prefetch
          className="text-[12.5px] font-semibold text-muted underline-offset-2 transition hover:text-accent hover:underline"
        >
          ← All users
        </Link>
      </div>

      <header className="mb-6 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <h1 className="m-0 truncate font-display text-[24px] font-semibold tracking-tight text-ink">
            {d.profile.email ?? d.profile.id}
          </h1>
          <p className="mt-1 text-[13px] text-muted">
            {d.profile.fullName ?? '—'} · joined {fmtDate(d.profile.createdAt)} · last sign-in{' '}
            {fmtRel(d.auth.lastSignInAt)}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {d.auth.isAdmin && <Badge tone="accent">admin</Badge>}
          {stateBadge}
        </div>
      </header>

      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Stored mail" value={fmtInt(d.counts.messages)} hint={`${fmtInt(d.counts.hidden)} hidden as noise`} />
        <KpiCard label="Open work items" value={fmtInt(d.counts.openItems)} />
        <KpiCard label="Replies sent" value={fmtInt(d.counts.draftsSent)} hint="via approved drafts" />
        <KpiCard label="AI spend · month" value={fmtUsd(d.aiMonth.cost)} hint={`${fmtInt(d.aiMonth.calls)} calls · ${fmtInt(d.aiMonth.tokens)} tokens`} />
      </div>

      <Section title="Account" hint="Identity, timezone, and account-level actions.">
        <Panel>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <DetailRow label="Email" value={d.profile.email ?? '—'} />
            <DetailRow label="Role (job title)" value={d.profile.role ?? '—'} />
            <DetailRow label="Email confirmed" value={d.auth.emailConfirmedAt ? fmtDate(d.auth.emailConfirmedAt) : 'not confirmed'} />
            <DetailRow label="Onboarded" value={d.profile.onboardedAt ? fmtDate(d.profile.onboardedAt) : 'not yet'} />
            {d.profile.suspended && (
              <DetailRow label="Suspension reason" value={d.profile.suspendedReason ?? '—'} />
            )}
          </dl>

          <div className="mt-4 border-t border-line/60 pt-4">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
              Timezone (their local-time display)
            </p>
            <TimezoneEditor userId={d.profile.id} current={d.profile.timezone} />
          </div>

          <div className="mt-4 border-t border-line/60 pt-4">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
              Actions
            </p>
            <div className="flex flex-wrap items-center justify-start gap-1.5">
              <UserRowActions
                userId={d.profile.id}
                email={d.profile.email}
                isAdmin={d.auth.isAdmin}
                suspended={d.profile.suspended}
                isSelf={d.profile.id === admin.id}
              />
              <a
                href={`/admin/users/${d.profile.id}/export`}
                className="inline-flex items-center justify-center gap-1.5 rounded-[10px] border border-line px-3 py-[7px] text-[12.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
                title="Download all of this user's data as JSON (portability / support). Audit-logged."
              >
                Export data
              </a>
              <RetriggerOnboardingButton userId={d.profile.id} />
            </div>
          </div>
        </Panel>
      </Section>

      <Section title="Mailbox & sync" hint="Connection health for this user.">
        <Panel>
          {d.mailbox.connected ? (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              <DetailRow label="Mailbox" value={d.mailbox.email ?? '—'} />
              <DetailRow label="Status" value={d.mailbox.status ?? '—'} />
              <DetailRow label="Watch mode" value={d.mailbox.triageMode ?? '—'} />
              <DetailRow label="Last sync" value={fmtRel(d.mailbox.lastSyncAt)} />
              {d.mailbox.lastError && (
                <DetailRow label="Last error" value={d.mailbox.lastError} danger />
              )}
            </dl>
          ) : (
            <p className="m-0 text-[13px] text-muted">No mailbox connected.</p>
          )}
          {d.settings && (
            <div className="mt-4 border-t border-line/60 pt-4">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
                Per-user overrides
              </p>
              <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                <DetailRow label="Reply-intent mode" value={d.settings.replyIntentMode ?? 'default'} />
                <DetailRow label="Send mode" value={d.settings.draftSendMode ?? 'default'} />
                <DetailRow label="AI paused" value={d.settings.aiPaused ? 'yes' : 'no'} />
                <DetailRow label="Retention" value={d.settings.retentionMonths ? `${d.settings.retentionMonths} months` : 'default'} />
              </dl>
            </div>
          )}
        </Panel>
      </Section>

      <Section title="Recent drafts" hint="Latest 10 — see Drafts & Sending for everything.">
        {d.drafts.length === 0 ? (
          <EmptyState>No drafts yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Subject</Th>
                <Th>Status</Th>
                <Th>Error</Th>
              </tr>
            </thead>
            <tbody>
              {d.drafts.map((dr) => (
                <tr key={dr.id}>
                  <Td className="whitespace-nowrap text-muted">{fmtRel(dr.at)}</Td>
                  <Td className="max-w-[300px]"><span className="break-words">{dr.subject ?? '—'}</span></Td>
                  <Td>
                    <Badge tone={dr.status === 'sent' ? 'good' : dr.status === 'failed' ? 'bad' : 'default'}>
                      {dr.status}
                    </Badge>
                  </Td>
                  <Td className="max-w-[220px]">
                    {dr.error ? <span className="break-words text-[12px] text-red">{dr.error}</span> : <span className="text-muted">—</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section
        title="Activity history"
        hint="Logins, sent replies, and admin actions on this account (latest 50)."
      >
        {d.audit.length === 0 ? (
          <EmptyState>
            No recorded activity yet. Sign-ins are recorded from now on; older logins predate
            activity tracking.
          </EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Event</Th>
                <Th>By</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody>
              {d.audit.map((a) => (
                <tr key={a.id}>
                  <Td className="whitespace-nowrap text-muted">
                    <span title={fmtDateTime(a.at)}>{fmtRel(a.at)}</span>
                  </Td>
                  <Td><Badge tone={a.action === 'login' ? 'good' : 'accent'}>{a.action}</Badge></Td>
                  <Td className="text-muted">{a.actorType}</Td>
                  <Td className="max-w-[300px] text-muted">
                    <span className="break-words font-mono text-[11px]">
                      {a.metadata && Object.keys(a.metadata as object).length > 0
                        ? JSON.stringify(a.metadata)
                        : '—'}
                    </span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
    </div>
  );
}

function DetailRow({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted">{label}</dt>
      <dd className={`m-0 mt-0.5 break-words text-[13px] ${danger ? 'text-red' : 'text-ink'}`}>{value}</dd>
    </div>
  );
}
