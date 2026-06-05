import type { KpiMetric } from '@/lib/types';
import { Icon, type IconName } from '@/components/ui/Icon';

/** Maps a KPI to its icon. Keyed by the metric id from demo data. */
const ICON_BY_ID: Record<string, IconName> = {
  'kpi-reply': 'inbox',
  'kpi-waiting': 'people',
  'kpi-followup': 'refresh',
  'kpi-drafts': 'drafts',
};

export function KpiCards({ metrics }: { metrics: KpiMetric[] }) {
  return (
    <section className="grid grid-cols-2 gap-[14px] md:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="relative overflow-hidden rounded-2xl border border-line bg-panel p-[17px] shadow-soft transition hover:-translate-y-[3px] hover:border-line-strong"
        >
          <div className="mb-[11px] grid h-8 w-8 place-items-center rounded-[10px] bg-accent-soft text-accent-2 shadow-[inset_0_0_0_1px_var(--line-strong)]">
            <Icon name={ICON_BY_ID[metric.id] ?? 'list'} className="h-[18px] w-[18px]" />
          </div>
          <strong className="block font-display text-[29px] font-semibold leading-none tracking-tight">
            {metric.value}
          </strong>
          <span className="mt-[5px] block text-[12.5px] font-medium text-muted">
            {metric.label}
          </span>
        </div>
      ))}
    </section>
  );
}
