import type { KpiMetric } from '@/lib/types';
import { Icon, type IconName } from '@/components/ui/Icon';

/**
 * Compact metrics strip (Phase 0.3) — replaces the six large KPI cards with a
 * single low-profile horizontal strip so the numbers support Today's Radar
 * instead of competing with it.
 *
 * The first four metrics are primary; the rest render smaller/secondary.
 * When `onSelect` is provided, primary tiles are buttons that filter the radar.
 */
const ICON_BY_ID: Record<string, IconName> = {
  // Real dashboard KPIs (lib/dashboard/data.ts).
  'kpi-overdue': 'clock',
  'kpi-waiting': 'people',
  'kpi-high': 'trend',
  'kpi-open': 'inbox',
  'kpi-followup': 'refresh',
  // Demo KPIs (lib/demo-data.ts).
  'kpi-decision-debt': 'brain',
  'kpi-people-blocked': 'people',
  'kpi-followup-risk': 'refresh',
  'kpi-promises-risk': 'shield',
  'kpi-drafts-ready': 'drafts',
  'kpi-time-to-clear': 'clock',
};

const TONE_TEXT: Record<KpiMetric['tone'], string> = {
  red: 'text-red',
  amber: 'text-amber',
  blue: 'text-accent',
  green: 'text-green',
};

const TONE_BG: Record<KpiMetric['tone'], string> = {
  red: 'bg-red-soft text-red',
  amber: 'bg-amber-soft text-amber',
  blue: 'bg-accent-soft text-accent',
  green: 'bg-green-soft text-green',
};

const PRIMARY_COUNT = 4;

export function MetricsStrip({
  metrics,
  onSelect,
}: {
  metrics: KpiMetric[];
  /** Filter Today's Radar to this tile's slice (primary tiles only). */
  onSelect?: (filter: KpiMetric['filter']) => void;
}) {
  const primary = metrics.slice(0, PRIMARY_COUNT);
  const secondary = metrics.slice(PRIMARY_COUNT);

  return (
    <section
      aria-label="Key manager metrics"
      className="flex flex-wrap items-stretch gap-x-1 gap-y-2 rounded-[var(--radius)] border border-line bg-panel p-2 shadow-soft sm:gap-x-2"
    >
      {primary.map((m, i) => {
        const inner = (
          <>
            <span
              className={`grid h-8 w-8 flex-none place-items-center rounded-[10px] ${TONE_BG[m.tone]}`}
            >
              <Icon name={ICON_BY_ID[m.id] ?? 'list'} className="h-[16px] w-[16px]" />
            </span>
            <div className="leading-tight">
              <span className="flex items-baseline gap-[2px]">
                <strong className="font-display text-[19px] font-semibold tracking-tight text-ink">
                  {m.value}
                </strong>
                {m.unit && <span className="text-[12px] font-semibold text-muted">{m.unit}</span>}
              </span>
              <span className="block text-[11px] font-medium text-muted">{m.label}</span>
            </div>
          </>
        );
        const tileClass =
          'flex items-center gap-[10px] rounded-[12px] px-[10px] py-[7px] transition hover:bg-panel-2';
        return (
          <div key={m.id} className="flex items-center">
            {i > 0 && <span className="mx-1 hidden h-7 w-px bg-line sm:block" aria-hidden="true" />}
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(m.filter)}
                title={`Show: ${m.label}`}
                className={`${tileClass} cursor-pointer text-left`}
              >
                {inner}
              </button>
            ) : (
              <div className={tileClass}>{inner}</div>
            )}
          </div>
        );
      })}

      {/* Secondary metrics — smaller, muted, pushed to the end. */}
      {secondary.length > 0 && (
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 px-[10px] py-[6px]">
          {secondary.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-baseline gap-[5px] text-[12px] text-muted"
            >
              <span className="font-medium">{m.label}</span>
              <strong className={`font-display text-[14px] font-semibold ${TONE_TEXT[m.tone]}`}>
                {m.value}
                {m.unit ?? ''}
              </strong>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
