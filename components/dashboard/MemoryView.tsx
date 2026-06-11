'use client';

import { useMemo, useState } from 'react';
import type { MemoryRecord, MemoryType } from '@/lib/types';
import {
  addMemory,
  approveMemory,
  deleteMemory,
  rejectMemory,
  setMemoryActive,
} from '@/app/actions/memories';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { NoMemoriesState } from '@/components/ui/StateView';

/**
 * Full-page "Memory & Rules" workspace — real since Phase 10.
 *
 * Backed by `manager_memories` via server actions: add / pause / resume /
 * forget, plus the approval queue for memories Vesta suggested (they do
 * nothing until approved here). Every active memory is read by AI analysis
 * (VIPs, delegation, hard limits, context) and by draft generation (tone,
 * hard limits, context) — see lib/ai/memory.ts.
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

export function MemoryView({ memories = [] }: { memories?: MemoryRecord[] }) {
  const { showToast } = useToast();
  const [pending, setPending] = useState(false);
  const [type, setType] = useState<MemoryType>('vip');
  const [text, setText] = useState('');
  const [category, setCategory] = useState<CategoryId>('all');
  // Rows hidden optimistically while their server action runs (the actions
  // call revalidatePath('/'), so the server list refreshes on its own).
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());

  const visibleRows = memories.filter((m) => !hiddenIds.has(m.id));
  const suggestions = visibleRows.filter((m) => m.pending);
  const saved = visibleRows.filter((m) => !m.pending);

  function hideRow(id: string) {
    setHiddenIds((s) => new Set(s).add(id));
  }

  async function run(
    id: string | null,
    action: () => Promise<{ ok: boolean; error?: string }>,
    okMessage: string,
  ) {
    setPending(true);
    const res = await action();
    setPending(false);
    if (res.ok) {
      showToast(okMessage);
    } else {
      if (id) {
        setHiddenIds((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }
      showToast(res.error ?? 'Something went wrong.');
    }
  }

  function submitAdd() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    void run(null, () => addMemory({ type, text: trimmed }), 'Saved — Vesta will use this.');
  }

  const visible = useMemo(
    () => (category === 'all' ? saved : saved.filter((m) => CATEGORY_OF[m.type] === category)),
    [saved, category],
  );

  /** Count per category for the filter-tab badges. */
  const counts = useMemo(() => {
    const c: Record<CategoryId, number> = {
      all: saved.length,
      people: 0,
      tone: 0,
      delegation: 0,
      safety: 0,
      context: 0,
    };
    for (const m of saved) c[CATEGORY_OF[m.type]]++;
    return c;
  }, [saved]);

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
          Teach Vesta who matters, how you prefer replies, and what to delegate. Every active
          memory is used when Vesta prioritises your radar and writes drafts. You can pause or
          delete any of them anytime — and nothing Vesta suggests applies until you approve it.
        </p>
      </header>

      {/* Workspace: main column + side help panel */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* 2. Suggestions waiting for approval (Vesta proposed, manager decides) */}
          {suggestions.length > 0 && (
            <div className="rounded-[var(--radius)] border border-accent/40 bg-accent-soft/40 p-5 shadow-soft">
              <h3 className="m-0 flex items-center gap-2 font-display text-[16px] font-semibold tracking-tight">
                <Icon name="sparkle" className="h-[16px] w-[16px] text-accent" />
                Vesta suggests — waiting for your approval
                <span className="rounded-full bg-accent px-[8px] py-px font-mono text-[10.5px] font-bold text-white">
                  {suggestions.length}
                </span>
              </h3>
              <p className="mb-0 mt-1 text-[12.5px] text-muted">
                These do nothing until you approve them.
              </p>
              <div className="mt-3 flex flex-col gap-[10px]">
                {suggestions.map((m) => (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center gap-[10px] rounded-[13px] border border-line bg-panel p-[12px]"
                  >
                    <span
                      className={`flex-none rounded-md px-[8px] py-[3px] font-mono text-[10px] font-semibold uppercase tracking-wide ${TAG_TONE[m.type]}`}
                    >
                      {TYPE_LABEL[m.type]}
                    </span>
                    <span className="min-w-[180px] flex-1 text-[13.5px] leading-snug text-ink-soft">
                      {m.text}
                    </span>
                    <span className="flex flex-none gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          hideRow(m.id);
                          void run(m.id, () => approveMemory(m.id), 'Approved — Vesta will use it.');
                        }}
                        className="rounded-full bg-gradient-to-br from-accent to-accent-2 px-[14px] py-[7px] text-[12px] font-semibold text-white transition hover:brightness-110"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          hideRow(m.id);
                          void run(m.id, () => rejectMemory(m.id), 'Rejected and forgotten.');
                        }}
                        className="rounded-full border border-line bg-panel px-[14px] py-[7px] text-[12px] font-semibold text-ink-soft transition hover:border-red hover:text-red"
                      >
                        Reject
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Add new memory / rule */}
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
                  if (e.key === 'Enter') submitAdd();
                }}
                placeholder="e.g. Treat maya@cedars.com as VIP"
                aria-label="New memory text"
                className="min-w-0 flex-1 rounded-[11px] border border-line bg-field px-3 py-[10px] text-[13px] text-ink outline-none placeholder:text-muted focus:border-accent"
              />
              <button
                type="button"
                onClick={submitAdd}
                disabled={pending}
                className="flex-none justify-center rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[16px] py-[10px] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.3)] transition hover:brightness-110 disabled:opacity-60"
              >
                ＋ Remember this
              </button>
            </div>
            <p className="mb-0 mt-2 text-[11.5px] text-muted">
              Tip: a VIP memory that includes an email address also marks that sender as VIP for
              filtering and priority.
            </p>
          </div>

          {/* 4. Category filter tabs */}
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

          {/* 5. Saved memories list */}
          {visible.length > 0 ? (
            <div className="grid grid-cols-1 gap-[11px] md:grid-cols-2">
              {visible.map((m) => (
                <div
                  key={m.id}
                  className={[
                    'animate-rise flex flex-col gap-[9px] rounded-[15px] border border-line bg-panel p-[15px] shadow-soft',
                    m.isActive ? '' : 'opacity-60',
                  ].join(' ')}
                >
                  <div className="flex items-start gap-[11px]">
                    <span
                      className={`mt-px flex-none rounded-md px-[8px] py-[3px] font-mono text-[10px] font-semibold uppercase tracking-wide ${TAG_TONE[m.type]}`}
                    >
                      {TYPE_LABEL[m.type]}
                    </span>
                    <span className="flex-1 text-[13.5px] leading-snug text-ink-soft">{m.text}</span>
                    <button
                      type="button"
                      onClick={() => {
                        hideRow(m.id);
                        void run(m.id, () => deleteMemory(m.id), 'Forgotten.');
                      }}
                      disabled={pending}
                      title="Forget this"
                      aria-label={`Forget memory: ${m.text}`}
                      className="flex-none rounded-md px-[3px] text-base leading-none text-muted transition hover:text-red"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pl-[2px]">
                    {m.scopeEmail && (
                      <span className="rounded-full bg-panel-2 px-[9px] py-[2px] font-mono text-[10px] text-muted">
                        {m.scopeEmail}
                      </span>
                    )}
                    {m.source !== 'manual' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-[9px] py-[2px] font-mono text-[10px] font-semibold text-accent">
                        <Icon name="sparkle" className="h-[10px] w-[10px]" />
                        Suggested by Vesta
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        void run(
                          null,
                          () => setMemoryActive(m.id, !m.isActive),
                          m.isActive ? 'Paused — Vesta will ignore it.' : 'Active again.',
                        )
                      }
                      className="ml-auto rounded-full border border-line px-[10px] py-[3px] text-[11px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
                    >
                      {m.isActive ? 'Pause' : 'Resume'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <NoMemoriesState />
          )}
        </div>

        {/* 6. Side help / tips panel */}
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
              Vesta never saves a memory on its own — anything it suggests waits here for your
              approval. These rules only shape prioritisation and drafts.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
