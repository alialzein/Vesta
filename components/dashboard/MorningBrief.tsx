import type { MorningBrief as MorningBriefData } from '@/lib/types';
import { UrgencyRing } from './UrgencyRing';

const ACTIONS = ['▶ Start Focus Mode', 'Generate Reply Drafts', 'Show Delegation Ideas'];

export function MorningBrief({ brief }: { brief: MorningBriefData }) {
  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.55fr_0.75fr]">
      {/* Hero card */}
      <div className="relative overflow-hidden rounded-[var(--radius)] border border-line-strong bg-[linear-gradient(135deg,var(--accent-soft),transparent_52%),var(--panel)] p-5 shadow-glow backdrop-blur-[16px]">
        <span
          className="pointer-events-none absolute -right-[130px] -top-[150px] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,var(--accent-soft),transparent_68%)] opacity-90"
          aria-hidden="true"
        />
        <span
          className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-accent to-accent-2 opacity-80"
          aria-hidden="true"
        />
        <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
          <span className="h-[7px] w-[7px] rounded-full bg-green shadow-[0_0_0_4px_var(--green-soft)]" />
          Live morning brief
        </div>
        <h2 className="m-0 mb-[10px] font-display text-[22px] font-medium tracking-tight">
          {brief.headline}
        </h2>
        <p
          className="m-0 max-w-[640px] text-sm leading-relaxed text-ink-soft [&_b]:font-semibold [&_b]:text-ink"
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

      {/* Urgency ring card */}
      <div className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-glow backdrop-blur-[16px]">
        <UrgencyRing score={brief.topUrgencyScore} />
      </div>
    </section>
  );
}
