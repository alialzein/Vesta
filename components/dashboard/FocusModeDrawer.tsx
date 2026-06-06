'use client';

import type { WorkItem } from '@/lib/types';
import { priorityBand } from '@/lib/priority';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/**
 * "Clear My Day" preview — a Focus Mode drawer that lists the highest-priority
 * work as a focused, ordered plan. Demo only: actions show local feedback.
 */
const bandDot: Record<ReturnType<typeof priorityBand>, string> = {
  red: 'bg-red',
  amber: 'bg-amber',
  green: 'bg-green',
};

export function FocusModeDrawer({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: WorkItem[];
}) {
  const { showToast } = useToast();

  // Highest-priority first; this is the "focus plan".
  const plan = [...items].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 4);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Focus Mode — Clear My Day"
      subtitle="Demo preview · a focused plan for your highest-risk work"
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              showToast(
                'Demo action recorded. Focus Mode runs for real in a later phase.',
                'success',
              );
              onClose();
            }}
            className="inline-flex items-center gap-[7px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[15px] py-[9px] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] transition hover:brightness-110"
          >
            <Icon name="sparkle" className="h-[15px] w-[15px]" />
            Start clearing
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[11px] border border-line-strong bg-panel-2 px-[15px] py-[9px] text-[13px] font-semibold text-ink transition hover:border-accent hover:text-accent"
          >
            Not now
          </button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Vesta turned your urgent decisions, follow-ups, and drafts into a short, ordered plan. Work
        through them one at a time to clear the highest risk with the fewest decisions.
      </p>

      <ol className="flex flex-col gap-[10px]">
        {plan.map((item, i) => (
          <li
            key={item.id}
            className="flex items-start gap-[12px] rounded-[14px] border border-line bg-panel-2 p-[14px]"
          >
            <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-accent-soft font-mono text-[13px] font-bold text-accent">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`h-[7px] w-[7px] flex-none rounded-full ${bandDot[priorityBand(item.priorityScore)]}`}
                  aria-hidden="true"
                />
                <h3 className="m-0 text-[14px] font-semibold tracking-tight">{item.title}</h3>
              </div>
              <p className="mt-[5px] text-[12.5px] leading-snug text-muted">
                {item.nextBestAction}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="flex items-start gap-2 text-[11.5px] leading-snug text-muted">
        <Icon name="shield" className="mt-px h-[14px] w-[14px] flex-none text-accent" />
        Vesta will not send emails without your explicit approval.
      </p>
    </Drawer>
  );
}
