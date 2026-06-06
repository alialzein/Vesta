'use client';

import { demoLowPriority } from '@/lib/demo-data';
import { Drawer } from '@/components/ui/Drawer';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/**
 * "Clean Inbox" preview — groups low-priority / FYI messages the manager can
 * safely batch away. Demo only.
 */
export function CleanInboxDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { showToast } = useToast();
  const items = demoLowPriority;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Clean Inbox"
      subtitle={`Demo preview · ${items.length} low-priority items grouped`}
      footer={
        <button
          type="button"
          onClick={() => {
            showToast(`Demo: ${items.length} FYI items moved out of your way.`, 'success');
            onClose();
          }}
          className="inline-flex items-center gap-[7px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-[15px] py-[9px] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] transition hover:brightness-110"
        >
          <Icon name="check" className="h-[15px] w-[15px]" />
          Mark all as reviewed
        </button>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink-soft">
        These look like FYI, newsletters, and low-risk messages. Vesta keeps them out of your
        critical queue so they don&apos;t interrupt you.
      </p>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-[11px] rounded-[13px] border border-line bg-panel-2 p-[13px]"
          >
            <span className="grid h-8 w-8 flex-none place-items-center rounded-[10px] bg-panel-soft text-muted">
              <Icon name="inbox" className="h-[16px] w-[16px]" />
            </span>
            <div className="min-w-0">
              <p className="m-0 truncate text-[13px] font-semibold text-ink">{item.subject}</p>
              <p className="m-0 mt-px text-[12px] text-muted">{item.from}</p>
            </div>
          </li>
        ))}
      </ul>
    </Drawer>
  );
}
