'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MemoryType, RailTab, WorkItem, WorkItemSource } from '@/lib/types';
import { addMemory } from '@/app/actions/memories';
import { MEMORY_PLACEHOLDER, MEMORY_TYPE_OPTIONS } from '@/lib/memory/presets';
import { priorityBand } from '@/lib/priority';
import { Chip } from '@/components/ui/Chip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';
import { useToast } from '@/components/ui/Toast';

const SOURCE_LABEL: Record<WorkItemSource, string> = {
  outlook: 'Outlook',
  teams: 'Teams',
  manual: 'Manual task',
  ai_commitment: 'AI commitment',
  calendar: 'Calendar',
};

/**
 * Contextual AI Assistant Rail.
 *
 * Shows the selected work item's AI context across four tabs (Action, Draft,
 * Memory, Activity). User-visible reasoning only (AGENTS.md: no hidden
 * chain-of-thought) and keeps the required safety copy on the Draft tab.
 *
 * Demo only: action buttons do not perform anything in Phase 0.1.
 */

const TABS: { id: RailTab; label: string; icon: IconName }[] = [
  { id: 'action', label: 'Action', icon: 'sparkle' },
  { id: 'draft', label: 'Draft', icon: 'edit' },
  { id: 'memory', label: 'Memory', icon: 'brain' },
  { id: 'activity', label: 'Activity', icon: 'activity' },
];

const MEMORY_LABEL: Record<MemoryType, string> = {
  vip: 'VIP',
  tone: 'Tone',
  delegation_rule: 'Delegate',
  do_not_do: 'Never',
  project_context: 'Project',
  company_context: 'Company',
  preference: 'Pref',
  personal: 'Me',
};

const MEMORY_TONE: Record<MemoryType, string> = {
  vip: 'bg-red-soft text-red',
  tone: 'bg-accent-soft text-accent',
  delegation_rule: 'bg-amber-soft text-amber',
  do_not_do: 'bg-red-soft text-red',
  project_context: 'bg-green-soft text-green',
  company_context: 'bg-green-soft text-green',
  preference: 'bg-green-soft text-green',
  personal: 'bg-accent-soft text-accent',
};

const bandLabel: Record<ReturnType<typeof priorityBand>, string> = {
  red: 'High priority',
  amber: 'Medium priority',
  green: 'Low priority',
};

type AiAssistantRailProps = {
  item: WorkItem;
  activeTab: RailTab;
  onTabChange: (tab: RailTab) => void;
  /** Collapses the rail to the slim icon strip. Optional (omitted on mobile). */
  onCollapse?: () => void;
  /** Phase 8 — clear the item off the radar (done = handled, dismiss = FYI). */
  onResolve?: (kind: 'done' | 'dismiss') => void;
  /** Phase 8 — snooze until an ISO timestamp; it returns when due. */
  onSnooze?: (untilIso: string) => void;
  /** Phase 9 — open the draft-reply composer for this item. */
  onOpenDraft?: () => void;
  /** Disables the action buttons while a resolve/snooze request is in flight. */
  busy?: boolean;
};

export function AiAssistantRail({
  item,
  activeTab,
  onTabChange,
  onCollapse,
  onResolve,
  onSnooze,
  onOpenDraft,
  busy,
}: AiAssistantRailProps) {
  const band = priorityBand(item.priorityScore);

  return (
    <div className="flex flex-col rounded-[var(--radius)] border border-[color:var(--rail-border)] bg-[image:var(--rail-bg)] shadow-glow">
      {/* Header — selected item title + collapse toggle. Declutter pass
          (2026-06-12): no second LIVE badge (the brief carries the one live
          signal), no context grid repeating the card (source/category/score
          are already on the row the manager just clicked) — only what the card
          does NOT show: the sender's real address and the last-email time. */}
      <div className="border-b border-line p-5">
        <div className="flex items-center gap-[9px]">
          <span className="grid h-7 w-7 flex-none place-items-center rounded-[9px] bg-accent-soft text-accent">
            <Icon name="sparkle" className="h-[16px] w-[16px]" />
          </span>
          <span className="font-display text-[15px] font-medium tracking-tight">AI Assistant</span>
          {/* Collapse toggle lives in the panel itself (small + simple). */}
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse AI assistant rail"
              title="Collapse"
              className="ml-auto grid h-7 w-7 flex-none place-items-center rounded-[8px] border border-line bg-panel-solid text-muted transition hover:border-accent hover:text-accent"
            >
              <Icon name="panelRight" className="h-[15px] w-[15px]" />
            </button>
          )}
        </div>

        <div className="mt-[12px] flex items-start gap-[10px]">
          <span
            className={[
              'grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px] font-mono text-[14px] font-bold',
              band === 'red'
                ? 'bg-red-soft text-red'
                : band === 'amber'
                  ? 'bg-amber-soft text-amber'
                  : 'bg-green-soft text-green',
            ].join(' ')}
            title={`${bandLabel[band]} — ${item.priorityScore}/100`}
          >
            {item.priorityScore}
          </span>
          <div className="min-w-0">
            <p className="m-0 text-[14px] font-semibold leading-snug text-ink">{item.title}</p>
            {/* Meta line WRAPS instead of truncating — a long sender address
                used to swallow the date ("… · Jun …"). Name/email may each
                truncate, but the time always stays whole on its own segment. */}
            <p className="m-0 mt-[3px] flex flex-wrap items-center gap-x-[6px] gap-y-[1px] font-mono text-[11px] text-muted">
              {item.person ? (
                <span className="max-w-full truncate">{item.person}</span>
              ) : (
                <span>{SOURCE_LABEL[item.source]}</span>
              )}
              {item.person && item.personEmail && item.personEmail !== item.person && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="max-w-full truncate" title={item.personEmail}>
                    {item.personEmail}
                  </span>
                </>
              )}
              {item.lastActivityAt && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="flex-none whitespace-nowrap">
                    <LocalTime iso={item.lastActivityAt} />
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Segmented control */}
      <div
        role="tablist"
        aria-label="AI assistant sections"
        className="flex gap-1 border-b border-line p-[6px]"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onTabChange(tab.id)}
              className={[
                'flex flex-1 items-center justify-center gap-[5px] rounded-[10px] px-2 py-[7px] text-[12px] font-semibold transition-all duration-200',
                isActive
                  ? 'bg-panel-solid text-accent shadow-[0_0_0_1px_var(--accent-soft),0_6px_16px_rgba(47,125,235,0.14)]'
                  : 'text-muted hover:bg-panel-2 hover:text-ink-soft',
              ].join(' ')}
            >
              <Icon name={tab.icon} className="h-[14px] w-[14px]" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab panels */}
      <div role="tabpanel" className="p-5">
        {activeTab === 'action' && (
          <ActionTab
            item={item}
            onResolve={onResolve}
            onSnooze={onSnooze}
            onOpenDraft={onOpenDraft}
            busy={busy}
          />
        )}
        {activeTab === 'draft' && <DraftTab item={item} onOpenDraft={onOpenDraft} />}
        {activeTab === 'memory' && <MemoryTab item={item} />}
        {activeTab === 'activity' && <ActivityTab item={item} />}
      </div>
    </div>
  );
}

/* ------------------------------- Tab panels ------------------------------- */

function ActionTab({
  item,
  onResolve,
  onSnooze,
  onOpenDraft,
  busy,
}: {
  item: WorkItem;
  onResolve?: (kind: 'done' | 'dismiss') => void;
  onSnooze?: (untilIso: string) => void;
  onOpenDraft?: () => void;
  busy?: boolean;
}) {
  const { showToast } = useToast();
  const [snoozeOpen, setSnoozeOpen] = useState(false);

  return (
    <div className="flex flex-col gap-[14px]">
      {/* Next Best Action — the single most important section. */}
      <div className="relative overflow-hidden rounded-[16px] border border-accent bg-[linear-gradient(135deg,var(--accent-soft),transparent_65%)] p-[16px] shadow-[0_0_0_3px_var(--accent-soft)]">
        <span
          className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[radial-gradient(circle,var(--accent-soft),transparent_70%)]"
          aria-hidden="true"
        />
        {/* Slow scanning shimmer — signals the AI is "thinking" (calm, subtle). */}
        <span
          className="animate-vesta-shimmer pointer-events-none absolute inset-y-0 -left-1/3 w-1/2 bg-[linear-gradient(100deg,transparent,var(--accent-soft),transparent)] opacity-60"
          aria-hidden="true"
        />
        <span className="relative inline-flex items-center gap-[6px] font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-accent">
          <Icon name="sparkle" className="h-[14px] w-[14px]" />
          Next best action
        </span>
        <p className="relative mt-[8px] font-display text-[16px] font-semibold leading-snug text-ink">
          {item.nextBestAction}
        </p>
        {/* Pre-AI, the next best action is to read & reply, so this opens the full
            conversation. Phase 7 turns it into the real one-click action. */}
        {item.threadId ? (
          <Link
            href={`/thread/${item.threadId}`}
            prefetch
            className="relative mt-[12px] inline-flex items-center gap-[7px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[14px] py-[8px] text-[12.5px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] transition hover:brightness-110"
          >
            <Icon name="mail" className="h-[14px] w-[14px]" />
            Open thread to act
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => showToast('One-click actions arrive as Vesta gains AI in the next phases.')}
            className="relative mt-[12px] inline-flex items-center gap-[7px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[14px] py-[8px] text-[12.5px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] transition hover:brightness-110"
          >
            <Icon name="check" className="h-[14px] w-[14px]" />
            Do this now
          </button>
        )}
      </div>

      {/* Why this matters */}
      <div className="rounded-[14px] border border-line bg-panel-solid p-[14px]">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Why this matters
        </span>
        <div className="mt-[8px] flex gap-[10px] text-[13px] leading-snug text-ink-soft">
          <span className="mt-[6px] h-[7px] w-[7px] flex-none rounded-full bg-accent shadow-[0_0_0_4px_var(--accent-soft)]" />
          <span>{item.urgencyReason}</span>
        </div>
        <div className="mt-[10px] flex flex-wrap gap-[6px]">
          {item.riskChips.map((chip) => (
            <Chip key={chip.label} {...chip} />
          ))}
        </div>
      </div>

      {/* Manage — real Phase 8 actions: clear the item or snooze it. */}
      {(onResolve || onSnooze) && (
        <div className="flex flex-wrap items-center gap-[9px]">
          {onResolve && (
            <>
              <RailButton icon="check" disabled={busy} onClick={() => onResolve('done')}>
                Mark done
              </RailButton>
              <RailButton icon="close" disabled={busy} onClick={() => onResolve('dismiss')}>
                Dismiss
              </RailButton>
            </>
          )}
          {onSnooze && (
            <div className="relative">
              <RailButton icon="snooze" disabled={busy} onClick={() => setSnoozeOpen((o) => !o)}>
                Snooze
              </RailButton>
              {snoozeOpen && (
                <div
                  role="menu"
                  className="absolute left-0 top-[calc(100%+6px)] z-10 flex min-w-[170px] flex-col overflow-hidden rounded-[12px] border border-line bg-panel-solid p-1 shadow-glow"
                >
                  {snoozeOptions().map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSnoozeOpen(false);
                        onSnooze(opt.iso);
                      }}
                      className="flex items-center justify-between gap-3 rounded-[9px] px-[10px] py-[8px] text-left text-[12.5px] font-semibold text-ink-soft transition hover:bg-accent-soft hover:text-accent"
                    >
                      {opt.label}
                      <span className="font-mono text-[10.5px] text-muted">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* AI actions — Draft reply (Phase 9). No Delegate button until the
          delegation feature exists (declutter pass: dead buttons are noise;
          the sidebar's "Delegation · Soon" row carries the roadmap honesty). */}
      {item.canDraft && (
        <div className="flex flex-wrap gap-[9px]">
          <RailButton primary icon="edit" onClick={onOpenDraft}>
            {item.draft
              ? 'Review draft'
              : item.categories.includes('waiting_on_them')
                ? 'Draft follow-up'
                : 'Draft reply'}
          </RailButton>
        </div>
      )}
    </div>
  );
}

/** Snooze presets shown in the rail menu. Computed at click time in the viewer's
 *  local zone; the server stores the resulting absolute instant. */
function snoozeOptions(): { label: string; hint: string; iso: string }[] {
  const now = new Date();
  const later = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const nextWeek = new Date(now);
  nextWeek.setDate(now.getDate() + 7);
  nextWeek.setHours(9, 0, 0, 0);
  return [
    {
      label: 'Later today',
      hint: later.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      iso: later.toISOString(),
    },
    {
      label: 'Tomorrow',
      hint: tomorrow.toLocaleDateString(undefined, { weekday: 'short' }) + ' 9 AM',
      iso: tomorrow.toISOString(),
    },
    {
      label: 'Next week',
      hint: nextWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      iso: nextWeek.toISOString(),
    },
  ];
}

function DraftTab({ item, onOpenDraft }: { item: WorkItem; onOpenDraft?: () => void }) {
  // Manual tasks / notes have no thread to answer.
  if (!item.canDraft) {
    return (
      <div className="flex flex-col gap-[12px]">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Draft reply
        </span>
        <div className="rounded-[13px] border border-line bg-panel-solid p-[14px] text-[13px] leading-relaxed text-muted">
          This item isn&apos;t an email thread, so there&apos;s nothing to reply to.
        </div>
      </div>
    );
  }

  const hasDraft = !!item.draft;
  // "Waiting on them" drafts are follow-up nudges, not replies — label honestly.
  const isFollowUp = item.categories.includes('waiting_on_them');
  const flagged = item.draft?.requiresHumanReview || (item.draft?.sensitiveTopics?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {hasDraft ? 'Draft ready' : isFollowUp ? 'AI follow-up nudge' : 'AI draft reply'}
        </span>
        {hasDraft && (
          <span className="rounded-full bg-green-soft px-[8px] py-[2px] font-mono text-[10px] font-semibold uppercase tracking-wide text-green">
            {item.draft?.status === 'edited' ? 'Edited' : 'Drafted'}
          </span>
        )}
      </div>

      <div className="rounded-[13px] border border-line bg-panel-solid p-[14px] text-[13px] leading-relaxed text-ink-soft">
        {hasDraft ? (
          <span className="block max-h-[180px] overflow-hidden whitespace-pre-wrap">
            {item.draft?.bodyText}
          </span>
        ) : isFollowUp ? (
          'They owe you an answer on this thread. Vesta can write a short, polite follow-up asking for it. You review and edit, then approve — nothing sends without you.'
        ) : (
          'Vesta can write a reply to the latest message in this thread. You review and edit it, then approve — nothing sends without you.'
        )}
      </div>

      {flagged && (
        <p className="flex items-start gap-2 rounded-[10px] bg-amber-soft/60 px-3 py-2 text-[11.5px] leading-snug text-ink-soft">
          <Icon name="info" className="mt-px h-[14px] w-[14px] flex-none text-amber" />
          Flagged for careful review before sending.
        </p>
      )}

      {/* Safety copy — required by the UX spec. */}
      <p className="flex items-start gap-2 text-[11.5px] leading-snug text-muted">
        <Icon name="shield" className="mt-px h-[14px] w-[14px] flex-none text-accent" />
        Vesta will not send emails without your explicit approval. Please review before sending.
      </p>

      <div className="flex flex-wrap gap-[9px]">
        <RailButton primary icon="edit" onClick={onOpenDraft}>
          {hasDraft ? 'Review & send' : isFollowUp ? 'Draft a follow-up' : 'Draft a reply'}
        </RailButton>
      </div>
    </div>
  );
}

function MemoryTab({ item }: { item: WorkItem }) {
  const { showToast } = useToast();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<MemoryType>('preference');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  // Globally-applicable types are never pinned to the sender — tone, company
  // facts, and "about me" describe the manager, not this thread's person.
  const globalType = type === 'tone' || type === 'company_context' || type === 'personal';

  // Real since Phase 10: saves a memory scoped to this item's sender (when
  // known), so "always escalate Maya" lands exactly on Maya's threads. The
  // action revalidates the dashboard, so "memory used" refreshes on its own.
  async function save() {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    const res = await addMemory({
      type,
      text: trimmed,
      scopeEmail: globalType ? null : item.personEmail ?? null,
    });
    setSaving(false);
    if (res.ok) {
      setText('');
      setAdding(false);
      showToast('Saved to Memory & Rules — Vesta will use it.');
    } else {
      showToast(res.error ?? 'Could not save the memory.');
    }
  }

  return (
    <div className="flex flex-col gap-[12px]">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Memory &amp; rules used
      </span>

      {item.memoryUsed.length > 0 ? (
        <div className="flex flex-col gap-2">
          {item.memoryUsed.map((m) => (
            <div
              key={m.id}
              className="flex items-start gap-[10px] rounded-xl border border-line bg-panel-solid px-3 py-[11px]"
            >
              <span
                className={`mt-px flex-none rounded-md px-[7px] py-[3px] font-mono text-[9.5px] font-semibold uppercase tracking-wide ${MEMORY_TONE[m.type]}`}
              >
                {MEMORY_LABEL[m.type]}
              </span>
              <span className="flex-1 text-[12.5px] leading-snug text-ink-soft">{m.text}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-panel-solid px-3 py-4 text-center text-[12.5px] text-muted">
          No rules applied to this item yet.
        </p>
      )}

      {adding ? (
        <div className="flex flex-col gap-[8px] rounded-[13px] border border-line bg-panel-solid p-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MemoryType)}
            aria-label="Memory type"
            className="w-full cursor-pointer rounded-[10px] border border-line bg-field px-[10px] py-[8px] text-[12px] font-semibold text-ink focus:border-accent"
          >
            {MEMORY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void save();
            }}
            // Sample for the selected type; preference gets a sender-aware one.
            placeholder={
              type === 'preference' && item.person
                ? `e.g. Always answer ${item.person} same-day`
                : MEMORY_PLACEHOLDER[type]
            }
            aria-label="New memory text"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className="w-full rounded-[10px] border border-line bg-field px-3 py-[8px] text-[12.5px] text-ink outline-none placeholder:text-muted focus:border-accent"
          />
          {item.personEmail && !globalType && (
            <span className="font-mono text-[10px] text-muted">
              Applies to {item.personEmail}
            </span>
          )}
          <div className="flex gap-2">
            <RailButton primary icon="check" onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save memory'}
            </RailButton>
            <RailButton icon="close" onClick={() => setAdding(false)}>
              Cancel
            </RailButton>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-[7px] rounded-[11px] border border-dashed border-line-strong bg-panel-solid px-3 py-[10px] text-[12.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="plus" className="h-[15px] w-[15px]" />
          Add a memory or rule
        </button>
      )}

      <p className="text-[11.5px] leading-snug text-muted">
        This memory affects future prioritization and drafts. Manage it all in Memory &amp; Rules.
      </p>
    </div>
  );
}

function ActivityTab({ item }: { item: WorkItem }) {
  return (
    <div className="flex flex-col gap-[10px]">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Thread activity
      </span>
      <dl className="flex flex-col divide-y divide-line overflow-hidden rounded-[13px] border border-line bg-panel-solid">
        {item.activity.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 px-[14px] py-[11px]"
          >
            <dt className="text-[12.5px] text-muted">{row.label}</dt>
            <dd className="m-0 text-[12.5px] font-semibold text-ink-soft">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ------------------------------- Primitives ------------------------------- */

function RailButton({
  children,
  icon,
  primary = false,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  icon: IconName;
  primary?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-[6px] rounded-[11px] px-[11px] py-[7px] text-[12px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
        primary
          ? 'bg-gradient-to-br from-accent to-accent-2 text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] hover:brightness-110'
          : 'border border-line-strong bg-panel-solid text-ink hover:-translate-y-[2px] hover:border-accent hover:text-accent',
      ].join(' ')}
    >
      <Icon name={icon} className="h-[14px] w-[14px]" />
      {children}
    </button>
  );
}
