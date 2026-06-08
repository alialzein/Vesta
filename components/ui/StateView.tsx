import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

/**
 * Reusable empty / loading / disconnected / error states.
 *
 * Phase 0.2 ships these as ready-to-use placeholders so Phase 1/2 can drop them
 * into real data flows (empty radar, loading work items, Outlook not connected,
 * AI unavailable, no memories, no drafts). See docs/archive/demo/demo-behavior.md.
 */

type StateViewProps = {
  icon: IconName;
  title: string;
  description?: string;
  /** Visual tone of the icon badge. */
  tone?: 'neutral' | 'accent' | 'amber' | 'red';
  /** Optional action (e.g. a "Connect Outlook" button — demo only). */
  action?: ReactNode;
  /** Render the animated loading variant (icon spins, skeleton lines). */
  loading?: boolean;
  className?: string;
};

const TONE: Record<NonNullable<StateViewProps['tone']>, string> = {
  neutral: 'bg-panel-soft text-muted',
  accent: 'bg-accent-soft text-accent',
  amber: 'bg-amber-soft text-amber',
  red: 'bg-red-soft text-red',
};

export function StateView({
  icon,
  title,
  description,
  tone = 'neutral',
  action,
  loading = false,
  className = '',
}: StateViewProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-3 rounded-[15px] border border-dashed border-line bg-panel-2 px-5 py-8 text-center',
        className,
      ].join(' ')}
      role={loading ? 'status' : undefined}
      aria-live={loading ? 'polite' : undefined}
    >
      <span className={`grid h-11 w-11 place-items-center rounded-[13px] ${TONE[tone]}`}>
        <Icon name={icon} className={`h-[20px] w-[20px] ${loading ? 'animate-spin-slow' : ''}`} />
      </span>
      <div>
        <p className="m-0 text-[14px] font-semibold text-ink">{title}</p>
        {description && (
          <p className="mx-auto mt-1 max-w-[320px] text-[12.5px] leading-snug text-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

/* ----------------------- Named presets for Phase 1/2 ---------------------- */

export function EmptyRadarState() {
  return (
    <StateView
      icon="check"
      tone="accent"
      title="Your critical queue is clear"
      description="No urgent follow-ups right now. New work items will appear here as they arrive."
    />
  );
}

export function LoadingWorkItemsState() {
  return (
    <StateView
      icon="refresh"
      tone="accent"
      loading
      title="Loading your work items…"
      description="Vesta is gathering decisions, follow-ups, and blockers."
    />
  );
}

export function OutlookNotConnectedState({ action }: { action?: ReactNode }) {
  return (
    <StateView
      icon="inbox"
      tone="amber"
      title="Outlook isn't connected yet"
      description="Connect your mailbox to bring real decisions and follow-ups into Vesta."
      action={action}
    />
  );
}

export function AiUnavailableState() {
  return (
    <StateView
      icon="sparkle"
      tone="amber"
      title="AI analysis is unavailable"
      description="Vesta couldn't reach the analysis service. Your items are still listed; reasoning will return shortly."
    />
  );
}

export function NoMemoriesState() {
  return (
    <StateView
      icon="brain"
      tone="neutral"
      title="No memories yet"
      description="Teach Vesta who is VIP, your preferred tone, and what to delegate."
    />
  );
}

export function NoDraftsState() {
  return (
    <StateView
      icon="drafts"
      tone="neutral"
      title="No drafts ready"
      description="When Vesta prepares a reply for your approval, it will show up here."
    />
  );
}
