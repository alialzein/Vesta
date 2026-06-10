import { requireAdmin } from '@/lib/admin/auth';
import { listManagerRules, listManagerMemories, listFeedbackEvents } from '@/lib/admin/data';
import { Section, Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { TriageTables } from '@/components/admin/tabs/TriageTables';
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
          The deterministic rules and AI memories that shape each user&apos;s triage. Search for a
          user to view and manage their set — toggle or delete anything that&apos;s wrong.
        </p>
      </header>

      <TriageTables rules={rules} memories={memories} />

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
