import type { WorkItem } from '@/lib/types';
import { Chip } from '@/components/ui/Chip';

/**
 * Right-rail AI Analysis panel. Shows user-visible reasoning only
 * (AGENTS.md: no hidden chain-of-thought) and the mandatory safety copy
 * from docs/product/dashboard-ux-spec.md.
 */
export function AiAnalysisPanel({ item }: { item: WorkItem }) {
  return (
    <div className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-glow backdrop-blur-[16px]">
      <h2 className="m-0 flex items-center gap-[9px] font-display text-[18px] font-medium tracking-tight">
        AI Analysis
        <span className="ml-auto rounded-full bg-accent-soft px-[9px] py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
          Live
        </span>
      </h2>

      <p className="mt-[10px] text-[13px] font-semibold text-ink">{item.title}</p>

      <div className="mt-[14px] rounded-[14px] border border-line bg-panel-2 p-[14px]">
        <strong className="mb-[9px] block font-mono text-[12px] text-accent">
          PRIORITY · {item.priorityScore} / 100
        </strong>
        <div className="my-[9px] flex gap-[10px] text-[13px] leading-snug text-ink-soft">
          <span className="mt-[6px] h-[7px] w-[7px] flex-none rounded-full bg-accent shadow-[0_0_0_4px_var(--accent-soft)]" />
          <span>{item.urgencyReason}</span>
        </div>
        <div className="flex flex-wrap gap-[6px]">
          {item.riskChips.map((chip) => (
            <Chip key={chip.label} {...chip} />
          ))}
        </div>
      </div>

      {/* Suggested draft */}
      <div className="mt-3 rounded-[13px] border border-dashed border-line-strong bg-panel-2 p-[13px] text-[13px] leading-relaxed text-ink-soft">
        <b className="text-ink">Suggested draft</b>
        <br />
        {item.suggestedDraft}
      </div>

      {/* Safety copy — required by the UX spec. */}
      <p className="mt-[10px] text-[11.5px] leading-snug text-muted">
        AI drafted this reply. Please review before sending. Vesta will not send emails
        automatically unless you explicitly enable that later.
      </p>

      <div className="mt-[14px] flex flex-wrap gap-[9px]">
        <button
          type="button"
          className="rounded-[11px] border-none bg-gradient-to-br from-accent to-accent-2 px-[11px] py-[7px] text-[12px] font-semibold text-white shadow-[0_10px_24px_rgba(74,111,165,0.35)] transition hover:brightness-110"
        >
          Approve Draft
        </button>
        {['Edit', 'Set Reminder'].map((label) => (
          <button
            key={label}
            type="button"
            className="rounded-[11px] border border-line-strong bg-panel-2 px-[11px] py-[7px] text-[12px] font-semibold text-ink transition hover:-translate-y-[2px] hover:border-accent hover:text-accent"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
