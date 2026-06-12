'use client';

import { useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';

/**
 * Bottom-sheet host for the AI rail on touch/small screens (mobile UX pass,
 * 2026-06-12). Below xl the side rail does not exist and the cards' hover
 * quick-actions can't fire on touch — so tapping a radar card used to do
 * nothing visible on a phone. Now it slides this sheet up with the SAME
 * AiAssistantRail component the desktop shows (Why this matters, Mark done /
 * Snooze / Draft reply, Memory, Activity) — one rail, two containers.
 *
 * `xl:hidden` end to end: on desktop this renders nothing visible and the
 * side rail stays the only surface. Esc / backdrop / the grab-handle close it.
 */
export function MobileRailSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div className="xl:hidden" aria-hidden={!open}>
      {/* Backdrop — tap anywhere above the sheet to dismiss. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={[
          'fixed inset-0 z-[94] bg-black/45 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Item actions"
        className={[
          // dvh (not vh) so the sheet respects mobile browser chrome; the
          // bottom padding clears the home-indicator on notched phones.
          'fixed inset-x-0 bottom-0 z-[95] max-h-[86dvh] overflow-hidden rounded-t-[20px] border-t border-line-strong bg-panel-solid shadow-panel transition-transform duration-300 ease-ease',
          open ? 'translate-y-0' : 'pointer-events-none translate-y-full',
        ].join(' ')}
      >
        {/* Grab handle + close — a familiar sheet affordance. */}
        <div className="relative grid place-items-center pb-1 pt-[10px]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close item actions"
            className="grid h-9 w-16 place-items-center rounded-full"
          >
            <span className="h-[5px] w-12 rounded-full bg-line-strong" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-2 grid h-8 w-8 place-items-center rounded-[9px] bg-panel-2 text-muted transition hover:text-ink"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="v-scroll max-h-[calc(86dvh-44px)] overflow-y-auto px-3 pb-[max(14px,env(safe-area-inset-bottom))]">
          {/* Only mount the rail while open — no hidden duplicate of the
              selected item's content in the accessibility tree. */}
          {open && children}
        </div>
      </div>
    </div>
  );
}
