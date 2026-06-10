'use client';

import { useState } from 'react';
import { Section, Table, Th, Td, Badge, EmptyState } from '@/components/admin/ui';
import { useTableControls, TableToolbar, Pager } from '@/components/admin/DataTable';
import { RuleRowActions } from '@/components/admin/tabs/RuleRowActions';
import { MemoryRowActions } from '@/components/admin/tabs/MemoryRowActions';
import { Icon } from '@/components/ui/Icon';
import type { RuleRow, MemoryRow } from '@/lib/admin/data';

/**
 * Rules & memories are per-user data and grow with every account — so both lists
 * are search-first: pick a user (type their email/name) before rows render.
 * This keeps the page readable at scale and avoids skimming other users' context
 * unnecessarily.
 */

type RRow = RuleRow & Record<string, unknown>;
type MRow = MemoryRow & Record<string, unknown>;

export function TriageTables({ rules, memories }: { rules: RuleRow[]; memories: MemoryRow[] }) {
  // One shared user search drives both sections.
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const active = q.length >= 2;

  const userRules = active
    ? (rules as RRow[]).filter((r) => String(r.email ?? r.userId).toLowerCase().includes(q))
    : [];
  const userMemories = active
    ? (memories as MRow[]).filter((m) => String(m.email ?? m.userId).toLowerCase().includes(q))
    : [];

  return (
    <>
      <div className="mb-6 rounded-[14px] border border-line bg-panel p-4 shadow-soft">
        <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">
          Find a user&apos;s rules &amp; memories
        </label>
        <span className="relative block max-w-[360px]">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a user's email (at least 2 characters)…"
            aria-label="Search user rules and memories"
            className="w-full rounded-[11px] border border-line bg-field py-[9px] pl-9 pr-3 text-[13px] text-ink outline-none transition placeholder:text-muted focus:border-accent"
          />
        </span>
        <p className="mb-0 mt-2 text-[12px] text-muted">
          {rules.length.toLocaleString('en-US')} rule(s) and{' '}
          {memories.length.toLocaleString('en-US')} memorie(s) across all users — search to view a
          user&apos;s set.
        </p>
      </div>

      {active && (
        <>
          <Section title="Manager rules" hint="Allow/mute/VIP rules (override or boost triage).">
            {userRules.length === 0 ? (
              <EmptyState>No rules for this search.</EmptyState>
            ) : (
              <RulesInner rows={userRules} />
            )}
          </Section>

          <Section title="Manager memories" hint="Soft context the AI uses (tone, role, preferences).">
            {userMemories.length === 0 ? (
              <EmptyState>No memories for this search.</EmptyState>
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
            <Th>User</Th>
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
            <Th>User</Th>
            <Th>Type</Th>
            <Th>Memory</Th>
            <Th>State</Th>
            <Th className="text-right">Actions</Th>
          </tr>
        </thead>
        <tbody>
          {t.rows.map((m) => (
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
      <Pager page={t.page} pageCount={t.pageCount} onPage={t.setPage} />
    </div>
  );
}
