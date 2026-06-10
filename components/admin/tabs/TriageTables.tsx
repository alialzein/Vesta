'use client';

import { useMemo, useState } from 'react';
import { Section, Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { useTableControls, TableToolbar, Pager } from '@/components/admin/DataTable';
import { RuleRowActions } from '@/components/admin/tabs/RuleRowActions';
import { MemoryRowActions } from '@/components/admin/tabs/MemoryRowActions';
import { fmtRel } from '@/lib/admin/format';
import type { RuleRow, MemoryRow } from '@/lib/admin/data';

/**
 * Rules & memories are per-user data and grow with every account. Default view
 * shows the 10 most recently added entries (across all users) so the operator
 * sees what's new at a glance; a user dropdown narrows to one account's full,
 * filterable set.
 */

type RRow = RuleRow & Record<string, unknown>;
type MRow = MemoryRow & Record<string, unknown>;

/** A rule or memory flattened into one "recently added" feed row. */
type RecentRow = {
  kind: 'rule' | 'memory';
  id: string;
  email: string | null;
  userId: string;
  type: string;
  content: string;
  active: boolean;
  createdAt: string;
};

export function TriageTables({ rules, memories }: { rules: RuleRow[]; memories: MemoryRow[] }) {
  const [selectedUser, setSelectedUser] = useState('');

  // Dropdown options: every user that owns at least one rule or memory.
  const userOptions = useMemo(() => {
    const map = new Map<string, string>(); // email/id key → label
    for (const r of rules) map.set(r.userId, r.email ?? r.userId);
    for (const m of memories) map.set(m.userId, m.email ?? m.userId);
    return [...map.entries()]
      .map(([userId, label]) => ({ userId, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rules, memories]);

  // Default feed: the 10 newest entries across rules + memories combined.
  const recent = useMemo<RecentRow[]>(() => {
    const all: RecentRow[] = [
      ...rules.map((r) => ({
        kind: 'rule' as const,
        id: r.id,
        email: r.email,
        userId: r.userId,
        type: r.ruleType ?? 'rule',
        content: r.name ?? (r.value ? `${r.match ?? ''}: ${r.value}` : '—'),
        active: r.enabled,
        createdAt: r.createdAt,
      })),
      ...memories.map((m) => ({
        kind: 'memory' as const,
        id: m.id,
        email: m.email,
        userId: m.userId,
        type: m.memoryType ?? 'memory',
        content: m.text ?? '—',
        active: m.active,
        createdAt: m.createdAt,
      })),
    ];
    return all.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 10);
  }, [rules, memories]);

  const userRules = selectedUser ? (rules as RRow[]).filter((r) => r.userId === selectedUser) : [];
  const userMemories = selectedUser
    ? (memories as MRow[]).filter((m) => m.userId === selectedUser)
    : [];

  return (
    <>
      <div className="mb-6 rounded-[14px] border border-line bg-panel p-4 shadow-soft">
        <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
          View a user&apos;s rules &amp; memories
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            aria-label="Select a user"
            className="min-w-[280px] rounded-[11px] border border-line bg-field px-3 py-[9px] text-[13px] text-ink outline-none transition focus:border-accent"
          >
            <option value="">All users — latest 10 additions</option>
            {userOptions.map((u) => (
              <option key={u.userId} value={u.userId}>
                {u.label}
              </option>
            ))}
          </select>
          <span className="text-[12px] text-muted">
            {rules.length.toLocaleString('en-US')} rule(s) ·{' '}
            {memories.length.toLocaleString('en-US')} memorie(s) across all users
          </span>
        </div>
      </div>

      {!selectedUser && (
        <Section
          title="Recently added"
          hint="The 10 newest rules & memories across all users — pick a user above to manage their full set."
        >
          {recent.length === 0 ? (
            <EmptyState>No rules or memories yet.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>User</Th>
                  <Th>Kind</Th>
                  <Th>Type</Th>
                  <Th>Content</Th>
                  <Th>State</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={`${r.kind}-${r.id}`}>
                    <Td className="whitespace-nowrap text-muted">{fmtRel(r.createdAt)}</Td>
                    <Td className="whitespace-nowrap">{r.email ?? r.userId}</Td>
                    <Td>
                      <Badge tone={r.kind === 'rule' ? 'accent' : 'default'}>{r.kind}</Badge>
                    </Td>
                    <Td className="text-muted">{r.type}</Td>
                    <Td className="max-w-[320px]">
                      <span className="break-words">{r.content}</span>
                    </Td>
                    <Td>{r.active ? <Badge tone="good">on</Badge> : <Badge>off</Badge>}</Td>
                    <Td>
                      <div className="flex justify-end">
                        {r.kind === 'rule' ? (
                          <RuleRowActions ruleId={r.id} enabled={r.active} />
                        ) : (
                          <MemoryRowActions memoryId={r.id} active={r.active} />
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Section>
      )}

      {selectedUser && (
        <>
          <Section title="Manager rules" hint="Allow/mute/VIP rules (override or boost triage).">
            {userRules.length === 0 ? (
              <EmptyState>This user has no rules.</EmptyState>
            ) : (
              <RulesInner rows={userRules} />
            )}
          </Section>

          <Section title="Manager memories" hint="Soft context the AI uses (tone, role, preferences).">
            {userMemories.length === 0 ? (
              <EmptyState>This user has no memories.</EmptyState>
            ) : (
              <MemoriesInner rows={userMemories} />
            )}
          </Section>
        </>
      )}
    </>
  );
}

function RulesInner({ rows }: { rows: RRow[] }) {
  const t = useTableControls<RRow>(rows, {
    searchKeys: ['name', 'value', 'ruleType'],
    facetKeys: ['ruleType'],
  });
  return (
    <div>
      <TableToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Filter rules…"
        total={t.total}
        facets={[
          { key: 'ruleType', label: 'Type', options: t.facetOptions.ruleType ?? [], value: t.facetValues.ruleType ?? '', onChange: (v) => t.setFacet('ruleType', v) },
        ]}
      />
      <Table>
        <thead>
          <tr>
            <Th>Rule</Th>
            <Th>Type</Th>
            <Th>Match</Th>
            <Th>State</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r) => (
            <tr key={r.id}>
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
      <Pager page={t.page} pageCount={t.pageCount} onPage={t.setPage} />
    </div>
  );
}

function MemoriesInner({ rows }: { rows: MRow[] }) {
  const t = useTableControls<MRow>(rows, {
    searchKeys: ['text', 'memoryType'],
    facetKeys: ['memoryType', 'active'],
  });
  return (
    <div>
      <TableToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Filter memories…"
        total={t.total}
        facets={[
          { key: 'memoryType', label: 'Type', options: t.facetOptions.memoryType ?? [], value: t.facetValues.memoryType ?? '', onChange: (v) => t.setFacet('memoryType', v) },
          { key: 'active', label: 'State', options: t.facetOptions.active ?? [], value: t.facetValues.active ?? '', onChange: (v) => t.setFacet('active', v) },
        ]}
      />
      <Table>
        <thead>
          <tr>
            <Th>Type</Th>
            <Th>Memory</Th>
            <Th>State</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {t.rows.map((m) => (
            <tr key={m.id}>
              <Td className="text-muted">{m.memoryType ?? '—'}</Td>
              <Td className="max-w-[420px]"><span className="break-words">{m.text ?? '—'}</span></Td>
              <Td>{m.active ? <Badge tone="good">active</Badge> : <Badge>off</Badge>}</Td>
              <Td>
                <MemoryRowActions memoryId={m.id} active={m.active} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pager page={t.page} pageCount={t.pageCount} onPage={t.setPage} />
    </div>
  );
}
