import type { MorningBrief as MorningBriefData } from '@/lib/types';
import { CompactUrgencyRing } from './UrgencyRing';

const ACTIONS = ['▶ Start Focus Mode', 'Generate Reply Drafts', 'Show Delegation Ideas'];

export function MorningBrief({ brief }: { brief: MorningBriefData }) {
  return (
    <section className="relative overflow-hidden rounded-[var(--radius)] border border-line-strong bg-[linear-gradient(135deg,var(--accent-soft),transparent_52%),var(--panel)] p-5 shadow-glow backdrop-blur-[16px]">
      <span
        className="pointer-events-none absolute -right-[120px] -top-[140px] h-[340px] w-[340px] rounded-full bg-[radial-gradient(circle,var(--accent-soft),transparent_68%)] opacity-90"
        aria-hidden="true"
      />
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-accent to-accent-2 opacity-80"
        aria-hidden="true"
      />

      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        {/* Brief text */}
        <div className="min-w-0 flex-1">
          <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            <span className="h-[7px] w-[7px] rounded-full bg-green shadow-[0_0_0_4px_var(--green-soft)]" />
            Live morning brief
          </div>
          <h2 className="m-0 mb-[10px] font-display text-[22px] font-medium tracking-tight">
            {brief.headline}
          </h2>
          <p
            className="m-0 max-w-[680px] text-sm leading-relaxed text-ink-soft [&_b]:font-semibold [&_b]:text-ink"
            dangerouslySetInnerHTML={{ __html: brief.body }}
          />
          <div className="mt-4 flex flex-wrap gap-[9px]">
            {ACTIONS.map((label, i) => (
              <button
                key={label}
                type="button"
                className={
                  i === 0
                    ? 'inline-flex items-center gap-[7px] rounded-[11px] border-none bg-gradient-to-br from-accent to-accent-2 px-[14px] py-[9px] text-[13px] font-semibold text-white shadow-[0_10px_24px_rgba(74,111,165,0.35)] transition hover:brightness-110'
                    : 'inline-flex items-center gap-[7px] rounded-[11px] border border-line-strong bg-panel-2 px-[14px] py-[9px] text-[13px] font-semibold text-ink transition hover:-translate-y-[2px] hover:border-accent hover:text-accent'
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Compact urgency ring — small, top-right of the brief */}
        <CompactUrgencyRing score={brief.topUrgencyScore} />
      </div>
    </section>
  );
}
