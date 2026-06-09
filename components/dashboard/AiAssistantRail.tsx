'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MemoryType, RailTab, WorkItem, WorkItemSource } from '@/lib/types';
import { priorityBand } from '@/lib/priority';
import { Chip } from '@/components/ui/Chip';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';
import { useToast } from '@/components/ui/Toast';

/** Honest "coming soon" feedback for actions that aren't built yet — tells the
 *  manager what the button will do and which phase it arrives in. */
const SOON = {
  draft:
    'AI draft replies arrive in Phase 9 — Vesta writes a reply for you to review, edit, and approve. Nothing sends without you.',
  escalate: 'Looping in Legal or a teammate arrives with delegation (Phase 10).',
  delegate: 'One-click delegation arrives in Phase 8.',
  snooze: 'Snooze & reminders arrive in Phase 8.',
  memory: 'Teaching Vesta memories & rules arrives in Phase 10.',
};

const SOURCE_LABEL: Record<WorkItemSource, string> = {
  outlook: 'Outlook',
  teams: 'Teams',
  manual: 'Manual',
  ai_commitment: 'AI commitment',
  calendar: 'Calendar',
};

const CATEGORY_LABEL: Record<string, string> = {
  critical: 'Critical',
  waiting: 'Blocker',
  followup: 'Follow-up',
  delegate: 'Can delegate',
  decision: 'Decision',
  promise: 'Promise',
  drafts: 'Draft ready',
  fyi: 'FYI',
};

/** Pick the most meaningful category to show as the item's primary label. */
function primaryCategory(item: WorkItem): string {
  const order = ['decision', 'waiting', 'promise', 'followup', 'delegate', 'critical'];
  const found = order.find((c) => item.categories.includes(c as WorkItem['categories'][number]));
  return CATEGORY_LABEL[found ?? item.categories[0]] ?? 'Work item';
}

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
};

const MEMORY_TONE: Record<MemoryType, string> = {
  vip: 'bg-red-soft text-red',
  tone: 'bg-accent-soft text-accent',
  delegation_rule: 'bg-amber-soft text-amber',
  do_not_do: 'bg-red-soft text-red',
  project_context: 'bg-green-soft text-green',
  company_context: 'bg-green-soft text-green',
  preference: 'bg-green-soft text-green',
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
  busy,
}: AiAssistantRailProps) {
  const band = priorityBand(item.priorityScore);

  return (
    <div className="flex flex-col rounded-[var(--radius)] border border-[color:var(--rail-border)] bg-[image:var(--rail-bg)] shadow-glow">
      {/* Header — selected item title + live badge + collapse toggle */}
      <div className="border-b border-line p-5">
        <div className="flex items-center gap-[9px]">
          <span className="grid h-7 w-7 flex-none place-items-center rounded-[9px] bg-accent-soft text-accent">
            <Icon name="sparkle" className="h-[16px] w-[16px]" />
          </span>
          <span className="font-display text-[15px] font-medium tracking-tight">AI Assistant</span>
          {/* LIVE status with a breathing pulse + ripple (Phase 0.5, Section E). */}
          <span className="ml-auto inline-flex items-center gap-[6px] rounded-full bg-accent-soft px-[9px] py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
            <span className="relative grid h-[6px] w-[6px] place-items-center">
              <span
                className="animate-vesta-ripple absolute h-[6px] w-[6px] rounded-full bg-green"
                aria-hidden="true"
              />
              <span className="animate-vesta-pulse relative h-[6px] w-[6px] rounded-full bg-green shadow-[0_0_0_2px_var(--green-soft)]" />
            </span>
            Live
          </span>
          {/* Collapse toggle lives in the panel itself (small + simple). */}
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse AI assistant rail"
              title="Collapse"
              className="grid h-7 w-7 flex-none place-items-center rounded-[8px] border border-line bg-panel-solid text-muted transition hover:border-accent hover:text-accent"
            >
              <Icon name="panelRight" className="h-[15px] w-[15px]" />
            </button>
          )}
        </div>

        <p className="mt-[12px] text-[14px] font-semibold leading-snug text-ink">{item.title}</p>

        <div className="mt-[10px] flex items-center gap-[10px]">
          <span
            className={[
              'grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px] font-mono text-[14px] font-bold',
              band === 'red'
                ? 'bg-red-soft text-red'
                : band === 'amber'
                  ? 'bg-amber-soft text-amber'
                  : 'bg-green-soft text-green',
            ].join(' ')}
          >
            {item.priorityScore}
          </span>
          <div className="leading-tight">
            <span className="block text-[12.5px] font-semibold text-ink-soft">
              {bandLabel[band]}
            </span>
            <span className="block font-mono text-[10.5px] text-muted">
              {item.priorityScore}/100 priority
            </span>
          </div>
        </div>

        {/* Context grid — makes the selected item unambiguous. */}
        <dl className="mt-[14px] grid grid-cols-2 gap-x-3 gap-y-[10px]">
          <ContextCell label="Source" value={SOURCE_LABEL[item.source]} icon="inbox" />
          {item.person && <ContextCell label="From" value={item.person} icon="people" />}
          {item.lastActivityAt ? (
            <div className="min-w-0">
              <dt className="flex items-center gap-[5px] font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                <Icon name="clock" className="h-[12px] w-[12px]" />
                Last email
              </dt>
              <dd className="m-0 mt-[3px] truncate text-[12.5px] font-semibold text-ink-soft">
                <LocalTime iso={item.lastActivityAt} />
              </dd>
            </div>
          ) : (
            <ContextCell label="Due" value={item.dueDetail ?? item.dueLabel} icon="clock" />
          )}
          <ContextCell label="Category" value={primaryCategory(item)} icon="list" />
        </dl>
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
          <ActionTab item={item} onResolve={onResolve} onSnooze={onSnooze} busy={busy} />
        )}
        {activeTab === 'draft' && <DraftTab item={item} />}
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
  busy,
}: {
  item: WorkItem;
  onResolve?: (kind: 'done' | 'dismiss') => void;
  onSnooze?: (untilIso: string) => void;
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

      {/* AI actions — arrive in later phases (honest placeholders). */}
      <div className="flex flex-wrap gap-[9px]">
        <RailButton primary icon="check" onClick={() => showToast(SOON.draft)}>
          Approve Draft
        </RailButton>
        <RailButton icon="shield" onClick={() => showToast(SOON.escalate)}>
          Ask Legal
        </RailButton>
        <RailButton icon="delegate" onClick={() => showToast(SOON.delegate)}>
          Delegate
        </RailButton>
      </div>
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

/** A label/value cell in the rail header context grid. */
function ContextCell({ label, value, icon }: { label: string; value: string; icon: IconName }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-[5px] font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
        <Icon name={icon} className="h-[12px] w-[12px]" />
        {label}
      </dt>
      <dd className="m-0 mt-[3px] truncate text-[12.5px] font-semibold text-ink-soft">{value}</dd>
    </div>
  );
}

function DraftTab({ item }: { item: WorkItem }) {
  const { showToast } = useToast();

  return (
    <div className="flex flex-col gap-[12px]">
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
        Suggested draft
      </span>
      <div className="rounded-[13px] border border-dashed border-line-strong bg-panel-solid p-[14px] text-[13px] leading-relaxed text-ink-soft">
        {item.suggestedDraft}
      </div>

      {/* Safety copy — required by the UX spec. */}
      <p className="flex items-start gap-2 text-[11.5px] leading-snug text-muted">
        <Icon name="shield" className="mt-px h-[14px] w-[14px] flex-none text-accent" />
        Vesta will not send emails without your explicit approval. Please review before sending.
      </p>

      <div className="flex flex-wrap gap-[9px]">
        <RailButton primary icon="check" onClick={() => showToast(SOON.draft)}>
          Approve Draft
        </RailButton>
        <RailButton icon="edit" onClick={() => showToast(SOON.draft)}>
          Edit
        </RailButton>
      </div>
    </div>
  );
}

function MemoryTab({ item }: { item: WorkItem }) {
  const { showToast } = useToast();

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

      {/* Add memory placeholder */}
      <button
        type="button"
        onClick={() => showToast(SOON.memory)}
        className="flex items-center justify-center gap-[7px] rounded-[11px] border border-dashed border-line-strong bg-panel-solid px-3 py-[10px] text-[12.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
      >
        <Icon name="plus" className="h-[15px] w-[15px]" />
        Add a memory or rule
      </button>

      <p className="text-[11.5px] leading-snug text-muted">
        This memory affects future prioritization. You can edit or delete it anytime.
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
