import { requireAdmin } from '@/lib/admin/auth';
import { listManagerRules, listManagerMemories, listFeedbackEvents } from '@/lib/admin/data';
import { Section, Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { RuleRowActions } from '@/components/admin/tabs/RuleRowActions';
import { MemoryRowActions } from '@/components/admin/tabs/MemoryRowActions';
import { fmtRel } from '@/lib/admin/format';

export default async function AdminTriagePage() {
  await requireAdmin();
  const [rules, memories, feedback] = await Promise.all([
    listManagerRules(),
    listManagerMemories(),
    listFeedbackEvents(50),
  ]);

  return (
    <div>
      <header className="mb-6">
        <h1 className="m-0 font-display text-[24px] font-semibold tracking-tight text-ink">
          Triage &amp; Rules
        </h1>
        <p className="mt-1 text-[13px] text-muted">
          The deterministic rules and AI memories that shape each user&apos;s triage, plus the
          corrections they&apos;ve made. Toggle or delete anything that&apos;s wrong.
        </p>
      </header>

      <Section title="Manager rules" hint="Allow/mute/VIP rules per user (override or boost triage).">
        {rules.length === 0 ? (
          <EmptyState>No rules yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Rule</Th>
                <Th>Type</Th>
                <Th>Match</Th>
                <Th>State</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <Td className="whitespace-nowrap">{r.email ?? r.userId}</Td>
                  <Td>{r.name ?? '—'}</Td>
                  <Td><Badge tone="accent">{r.ruleType ?? 'rule'}</Badge></Td>
                  <Td className="text-muted">{r.value ? `${r.match ?? ''}: ${r.value}` : '—'}</Td>
                  <Td>{r.enabled ? <Badge tone="good">on</Badge> : <Badge>off</Badge>}</Td>
                  <Td>
                    <RuleRowActions ruleId={r.id} enabled={r.enabled} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Manager memories" hint="Soft context the AI uses (tone, role, preferences).">
        {memories.length === 0 ? (
          <EmptyState>No memories yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Type</Th>
                <Th>Memory</Th>
                <Th>State</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {memories.map((m) => (
                <tr key={m.id}>
                  <Td className="whitespace-nowrap">{m.email ?? m.userId}</Td>
                  <Td className="text-muted">{m.memoryType ?? '—'}</Td>
                  <Td className="max-w-[360px]"><span className="break-words">{m.text ?? '—'}</span></Td>
                  <Td>{m.active ? <Badge tone="good">active</Badge> : <Badge>off</Badge>}</Td>
                  <Td>
                    <MemoryRowActions memoryId={m.id} active={m.active} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>

      <Section title="Feedback & corrections" hint="What users corrected — teaches Vesta (newest first).">
        {feedback.length === 0 ? (
          <EmptyState>No feedback yet.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>User</Th>
                <Th>Type</Th>
                <Th>Detail</Th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((f) => (
                <tr key={f.id}>
                  <Td className="whitespace-nowrap text-muted">{fmtRel(f.at)}</Td>
                  <Td className="whitespace-nowrap">{f.email ?? '—'}</Td>
                  <Td><Badge>{f.eventType ?? '—'}</Badge></Td>
                  <Td className="max-w-[360px] text-muted"><span className="break-words">{f.text ?? '—'}</span></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Section>
    </div>
  );
}
