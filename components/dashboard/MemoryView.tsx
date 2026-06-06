'use client';

import { useMemo, useState } from 'react';
import type { ManagerMemory, MemoryType } from '@/lib/types';
import { demoMemories } from '@/lib/demo-data';
import { Icon, type IconName } from '@/components/ui/Icon';
import { NoMemoriesState } from '@/components/ui/StateView';

/**
 * Full-page "Memory & Rules" workspace (Phase 0.4).
 *
 * Sections: page header + intro, an add form, category filter tabs, the saved
 * memories list, and a side help/tips panel. Demo only — memories live in local
 * React state for the session (no persistence, no AI). Saving real manager
 * memory requires explicit approval in a later phase.
 */

type CategoryId = 'all' | 'people' | 'tone' | 'delegation' | 'safety' | 'context';

/** Group the seven memory types into the five manager-facing categories. */
const CATEGORY_OF: Record<MemoryType, Exclude<CategoryId, 'all'>> = {
  vip: 'people',
  tone: 'tone',
  delegation_rule: 'delegation',
  do_not_do: 'safety',
  project_context: 'context',
  company_context: 'context',
  preference: 'tone',
};

const CATEGORIES: { id: CategoryId; label: string; icon: IconName }[] = [
  { id: 'all', label: 'All', icon: 'brain' },
  { id: 'people', label: 'VIPs & People', icon: 'people' },
  { id: 'tone', label: 'Tone & Style', icon: 'reply' },
  { id: 'delegation', label: 'Delegation', icon: 'delegate' },
  { id: 'safety', label: 'Safety / Never', icon: 'shield' },
  { id: 'context', label: 'Clients & Context', icon: 'list' },
];

const TYPE_OPTIONS: { value: MemoryType; label: string }[] = [
  { value: 'vip', label: 'VIP person' },
  { value: 'tone', label: 'Tone' },
  { value: 'delegation_rule', label: 'Delegation rule' },
  { value: 'do_not_do', label: 'Do NOT do' },
  { value: 'project_context', label: 'Project context' },
  { value: 'company_context', label: 'Company context' },
  { value: 'preference', label: 'Preference' },
];

const TYPE_LABEL: Record<MemoryType, string> = {
  vip: 'VIP',
  tone: 'Tone',
  delegation_rule: 'Delegate',
  do_not_do: 'Never',
  project_context: 'Project',
  company_context: 'Company',
  preference: 'Pref',
};

const TAG_TONE: Record<MemoryType, string> = {
  vip: 'bg-red-soft text-red',
  tone: 'bg-accent-soft text-accent',
  delegation_rule: 'bg-amber-soft text-amber',
  do_not_do: 'bg-red-soft text-red',
  project_context: 'bg-green-soft text-green',
  company_context: 'bg-green-soft text-green',
  preference: 'bg-green-soft text-green',
};

const TIPS = [
  'Mark VIPs so their messages always rise to the top.',
  'Set tone rules once — Vesta drafts in your voice.',
  'Delegation rules let Vesta suggest the right owner.',
  '“Never” rules are hard limits Vesta will not cross.',
];

let nextId = 200;

export function MemoryView() {
  const [memories, setMemories] = useState<ManagerMemory[]>(demoMemories);
  const [type, setType] = useState<MemoryType>('vip');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<CategoryId>('all');

  function addMemory() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMemories((prev) => [{ id: `mem-${nextId++}`, type, text: trimmed }, ...prev]);
    setText('');
  }

  function forget(id: string) {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }

  const visible = useMemo(
    () =>
      category === 'all' ? memories : memories.filter((m) => CATEGORY_OF[m.type] === category),
    [memories, category],
  );

  /** Count per category for the filter-tab badges. */
  const counts = useMemo(() => {
    const c: Record<CategoryId, number> = {
      all: memories.length,
      people: 0,
      tone: 0,
      delegation: 0,
      safety: 0,
      context: 0,
    };
    for (const m of memories) c[CATEGORY_OF[m.type]]++;
    return c;
  }, [memories]);

  return (
    <section className="flex flex-col gap-5">
      {/* 1. Page header + intro */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-[10px]">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-[11px] bg-accent-soft text-accent">
            <Icon name="brain" className="h-[20px] w-[20px]" />
          </span>
          <h2 className="m-0 font-display text-[26px] font-semibold tracking-tight">
            Memory &amp; Rules
          </h2>
          <span className="ml-2 rounded-full bg-accent-soft px-[10px] py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
            Teaches AI
          </span>
        </div>
        <p className="max-w-[760px] text-sm leading-relaxed text-muted">
          Teach Vesta who matters, how you prefer replies, and what to delegate. The assistant uses
          these every time it prioritises and drafts. This memory affects future prioritization —
          you can edit or delete it anytime.
        </p>
      </header>

      {/* Workspace: main column + side help panel */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* 2. Add new memory / rule */}
          <div className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-soft">
            <h3 className="m-0 flex items-center gap-2 font-display text-[16px] font-semibold tracking-tight">
              <Icon name="plus" className="h-[16px] w-[16px] text-accent" />
              Add a memory or rule
            </h3>
            <div className="mt-[14px] flex flex-col gap-[10px] sm:flex-row">
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MemoryType)}
                aria-label="Memory type"
                className="w-full flex-none cursor-pointer rounded-[11px] border border-line bg-field px-[12px] py-[10px] text-[13px] font-semibold text-ink focus:border-accent sm:w-[170px]"
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') addMemory();
                }}
                placeholder="e.g. Treat Cedars Group as VIP"
                aria-label="New memory text"
                className="min-w-0 flex-1 rounded-[11px] border border-line bg-field px-3 py-[10px] text-[13px] text-ink outline-none placeholder:text-muted focus:border-accent"
              />
              <button
                type="button"
                onClick={addMemory}
                className="flex-none justify-center rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[16px] py-[10px] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.3)] transition hover:brightness-110"
              >
                ＋ Remember this
              </button>
            </div>
          </div>

          {/* 3. Category filter tabs */}
          <div
            role="tablist"
            aria-label="Filter memories by category"
            className="v-scroll -mx-1 flex gap-[7px] overflow-x-auto px-1 pb-1"
          >
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={category === c.id}
                onClick={() => setCategory(c.id)}
                className={[
                  'inline-flex items-center gap-[7px] whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[12.5px] font-semibold transition',
                  category === c.id
                    ? 'border-accent bg-accent text-white shadow-[0_6px_16px_rgba(47,125,235,0.3)]'
                    : 'border-line bg-panel text-ink-soft hover:border-line-strong hover:text-ink',
                ].join(' ')}
              >
                <Icon name={c.icon} className="h-[14px] w-[14px]" />
                {c.label}
                <span
                  className={[
                    'rounded-full px-[7px] py-px font-mono text-[10px]',
                    category === c.id ? 'bg-white/20 text-white' : 'bg-panel-2 text-muted',
                  ].join(' ')}
                >
                  {counts[c.id]}
                </span>
              </button>
            ))}
          </div>

          {/* 4. Saved memories list */}
          {visible.length > 0 ? (
            <div className="grid grid-cols-1 gap-[11px] md:grid-cols-2">
              {visible.map((m) => (
                <div
                  key={m.id}
                  className="animate-rise flex items-start gap-[11px] rounded-[15px] border border-line bg-panel p-[15px] shadow-soft"
                >
                  <span
                    className={`mt-px flex-none rounded-md px-[8px] py-[3px] font-mono text-[10px] font-semibold uppercase tracking-wide ${TAG_TONE[m.type]}`}
                  >
                    {TYPE_LABEL[m.type]}
                  </span>
                  <span className="flex-1 text-[13.5px] leading-snug text-ink-soft">{m.text}</span>
                  <button
                    type="button"
                    onClick={() => forget(m.id)}
                    title="Forget this"
                    aria-label={`Forget memory: ${m.text}`}
                    className="flex-none rounded-md px-[3px] text-base leading-none text-muted transition hover:text-red"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <NoMemoriesState />
          )}
        </div>

        {/* 5. Side help / tips panel */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-[var(--radius)] border border-line bg-panel-soft p-5 shadow-soft">
            <h3 className="m-0 flex items-center gap-2 font-display text-[15px] font-semibold tracking-tight">
              <Icon name="info" className="h-[16px] w-[16px] text-accent" />
              How memory works
            </h3>
            <ul className="mt-[12px] flex list-none flex-col gap-[10px] p-0">
              {TIPS.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-[9px] text-[12.5px] leading-snug text-ink-soft"
                >
                  <Icon name="check" className="mt-px h-[14px] w-[14px] flex-none text-green" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius)] border border-line bg-panel-soft p-5 shadow-soft">
            <p className="flex items-start gap-2 text-[12px] leading-snug text-muted">
              <Icon name="shield" className="mt-px h-[15px] w-[15px] flex-none text-accent" />
              Vesta never sends email or saves sensitive memory without your explicit approval.
              These rules only shape prioritisation and drafts.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
