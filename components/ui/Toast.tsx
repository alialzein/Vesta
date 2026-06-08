'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

/**
 * Minimal demo-only toast system. Used to give local React feedback for
 * placeholder actions (no backend). See docs/archive/demo/demo-behavior.md.
 */

export type ToastTone = 'info' | 'success';

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  /** Show a transient toast. */
  showToast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast viewport — bottom-center, above the chat FAB. */}
      <div
        className="pointer-events-none fixed bottom-6 left-1/2 z-[120] flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2"
        role="region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="animate-rise pointer-events-auto flex items-start gap-[10px] rounded-[14px] border border-line bg-panel-solid px-[14px] py-[12px] shadow-panel"
          >
            <span
              className={`mt-px grid h-6 w-6 flex-none place-items-center rounded-full ${
                toast.tone === 'success' ? 'bg-green-soft text-green' : 'bg-accent-soft text-accent'
              }`}
            >
              <Icon
                name={toast.tone === 'success' ? 'check' : 'info'}
                className="h-[15px] w-[15px]"
              />
            </span>
            <span className="flex-1 text-[13px] leading-snug text-ink">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="flex-none rounded-md p-[2px] text-muted transition hover:text-ink"
            >
              <Icon name="close" className="h-[14px] w-[14px]" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
