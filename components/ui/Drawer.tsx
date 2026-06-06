'use client';

import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Shared right-side slide-in drawer with a backdrop. Closes on the X button,
 * backdrop click, or Escape. Used by the AI Command Center preview drawers
 * (Focus Mode, Meeting Prep). Demo only — no data is fetched.
 */
type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Small line under the title (e.g. a "demo preview" note). */
  subtitle?: string;
  children: ReactNode;
  /** Sticky footer (action buttons). */
  footer?: ReactNode;
};

export function Drawer({ open, onClose, title, subtitle, children, footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={[
          'fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={title}
        aria-hidden={!open}
        className={[
          'fixed right-0 top-0 z-[110] flex h-screen w-full max-w-[440px] flex-col border-l border-line bg-panel-solid shadow-panel transition-transform duration-300 ease-ease',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Head */}
        <div className="flex items-start gap-3 border-b border-line px-[18px] py-4">
          <div className="min-w-0">
            <b className="block font-display text-[17px] font-semibold tracking-tight">{title}</b>
            {subtitle && <small className="mt-px block text-[12px] text-muted">{subtitle}</small>}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close"
            className="ml-auto grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] border-none bg-panel-2 text-muted transition hover:bg-red-soft hover:text-red"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="v-scroll flex flex-1 flex-col gap-4 overflow-y-auto px-[18px] py-5">
          {open && children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex flex-wrap gap-[9px] border-t border-line bg-panel-2 px-[18px] py-4">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}
