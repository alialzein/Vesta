'use client';

import { demoMeetingPrep } from '@/lib/demo-data';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/**
 * "Meeting Prep" preview — a simple one-page brief drawer. Demo only.
 */
export function MeetingPrepDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const prep = demoMeetingPrep;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Meeting Prep — ${prep.title}`}
      subtitle="Demo preview · one-page brief generated from related items"
      footer={
        <button
          type="button"
          onClick={() => {
            showToast(
              'Demo action recorded. Real meeting briefs arrive in a later phase.',
              'success',
            );
            onClose();
          }}
          className="inline-flex items-center gap-[7px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[15px] py-[9px] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] transition hover:brightness-110"
        >
          <Icon name="check" className="h-[15px] w-[15px]" />
          Looks good
        </button>
      }
    >
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-muted">
        <span>
          <b className="text-ink-soft">When:</b> {prep.when}
        </span>
        <span>
          <b className="text-ink-soft">Attendees:</b> {prep.attendees}
        </span>
      </div>

      <PrepSection icon="list" title="Agenda" items={prep.agenda} />
      <PrepSection icon="brain" title="Open decisions" items={prep.openDecisions} />
      <PrepSection icon="sparkle" title="Suggested questions" items={prep.suggestedQuestions} />
    </Drawer>
  );
}

function PrepSection({
  icon,
  title,
  items,
}: {
  icon: 'list' | 'brain' | 'sparkle';
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-[14px] border border-line bg-panel-2 p-[14px]">
      <div className="mb-[9px] flex items-center gap-[7px]">
        <Icon name={icon} className="h-[15px] w-[15px] text-accent" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {title}
        </span>
      </div>
      <ul className="m-0 flex list-none flex-col gap-[7px] p-0">
        {items.map((line) => (
          <li
            key={line}
            className="flex items-start gap-[9px] text-[13px] leading-snug text-ink-soft"
          >
            <span className="mt-[7px] h-[5px] w-[5px] flex-none rounded-full bg-accent" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
