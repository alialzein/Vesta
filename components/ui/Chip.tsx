import type { Chip as ChipData } from '@/lib/types';

const toneClasses: Record<ChipData['tone'], string> = {
  red: 'bg-red-soft text-red border-transparent',
  amber: 'bg-amber-soft text-amber border-transparent',
  blue: 'bg-accent-soft text-accent border-transparent',
  neutral: 'bg-panel-2 text-ink-soft border-line',
};

export function Chip({ label, tone }: ChipData) {
  return (
    <span
      className={`rounded-full border px-[9px] py-[3px] text-[11px] font-semibold ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
