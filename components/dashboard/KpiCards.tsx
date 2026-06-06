import type { KpiMetric } from '@/lib/types';
import { Icon, type IconName } from '@/components/ui/Icon';

/** Maps a KPI to its icon. Keyed by the metric id from demo data. */
const ICON_BY_ID: Record<string, IconName> = {
  'kpi-decision-debt': 'brain',
  'kpi-people-blocked': 'people',
  'kpi-followup-risk': 'refresh',
  'kpi-promises-risk': 'shield',
  'kpi-drafts-ready': 'drafts',
  'kpi-time-to-clear': 'clock',
};

/** Icon-container accent classes per tone. */
const TONE_BY_KEY: Record<KpiMetric['tone'], string> = {
  red: 'bg-red-soft text-red shadow-[inset_0_0_0_1px_var(--red-soft)]',
  amber: 'bg-amber-soft text-amber shadow-[inset_0_0_0_1px_var(--amber-soft)]',
  blue: 'bg-accent-soft text-accent shadow-[inset_0_0_0_1px_var(--accent-soft)]',
  green: 'bg-green-soft text-green shadow-[inset_0_0_0_1px_var(--green-soft)]',
};

export function KpiCards({ metrics }: { metrics: KpiMetric[] }) {
  return (
    <section
      aria-label="Key manager metrics"
      className="grid grid-cols-2 gap-[14px] sm:grid-cols-3 xl:grid-cols-6"
    >
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-panel p-[16px] shadow-soft transition duration-300 hover:-translate-y-[3px] hover:border-line-strong hover:shadow-glow"
        >
          <div
            className={`mb-[12px] grid h-9 w-9 place-items-center rounded-[11px] ${TONE_BY_KEY[metric.tone]}`}
          >
            <Icon name={ICON_BY_ID[metric.id] ?? 'list'} className="h-[18px] w-[18px]" />
          </div>

          <div className="flex items-baseline gap-[3px]">
            <strong className="font-display text-[28px] font-semibold leading-none tracking-tight text-ink">
              {metric.value}
            </strong>
            {metric.unit && (
              <span className="font-display text-[15px] font-semibold text-muted">
                {metric.unit}
              </span>
            )}
          </div>

          <span className="mt-[7px] block text-[12.5px] font-semibold leading-tight text-ink-soft">
            {metric.label}
          </span>
          <span className="mt-[2px] block text-[11px] leading-tight text-muted">
            {metric.helper}
          </span>
        </div>
      ))}
    </section>
  );
}
