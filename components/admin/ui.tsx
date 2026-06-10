import type { ReactNode } from 'react';

/**
 * Presentational primitives for the operator console. All use theme tokens
 * (bg-panel, border-line, text-ink/muted) so light + dark both work. Pure
 * server components — no client JS.
 */

export function Panel({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-[14px] border border-line bg-panel p-5 shadow-soft ${className}`}>
      {children}
    </div>
  );
}

export function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="mb-7">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="m-0 font-display text-[17px] font-semibold tracking-tight text-ink">
            {title}
          </h2>
          {hint && <p className="mt-1 text-[12.5px] text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export type KpiTone = 'default' | 'good' | 'warn' | 'bad';

const TONE_RING: Record<KpiTone, string> = {
  default: 'border-line',
  good: 'border-green/40',
  warn: 'border-amber/50',
  bad: 'border-red/50',
};
const TONE_DOT: Record<KpiTone, string> = {
  default: 'bg-muted',
  good: 'bg-green',
  warn: 'bg-amber',
  bad: 'bg-red',
};

export function KpiCard({
  label,
  value,
  hint,
  tone = 'default',
  tooltip,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: KpiTone;
  /** Plain-language explanation shown on hover (native title). */
  tooltip?: string;
}) {
  return (
    <div
      className={`rounded-[13px] border bg-panel p-4 shadow-soft ${TONE_RING[tone]} ${tooltip ? 'cursor-help' : ''}`}
      title={tooltip}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 flex-none rounded-full ${TONE_DOT[tone]}`} aria-hidden="true" />
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-muted">
          {label}
        </span>
      </div>
      <div className="mt-2 font-display text-[26px] font-semibold leading-none tracking-tight text-ink">
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[12px] text-muted">{hint}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: ReactNode;
  tone?: KpiTone | 'accent';
}) {
  const map: Record<string, string> = {
    default: 'border-line text-muted',
    good: 'border-green/40 text-green',
    warn: 'border-amber/50 text-amber',
    bad: 'border-red/50 text-red',
    accent: 'border-accent/40 text-accent',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[11px] font-semibold ${map[tone]}`}
    >
      {children}
    </span>
  );
}

/** A simple themed table shell. Children are <thead>/<tbody>. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[14px] border border-line bg-panel shadow-soft">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  );
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={`border-b border-line px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-line/60 px-3 py-2.5 align-middle text-ink ${className}`}>{children}</td>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-dashed border-line bg-panel-2 px-5 py-10 text-center text-[13px] text-muted">
      {children}
    </div>
  );
}
