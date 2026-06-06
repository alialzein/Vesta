import type { Chip as ChipData } from '@/lib/types';

// Soft, low-contrast pills (Phase 0.5, Section A.5): no heavy borders so chips
// read as quiet metadata rather than nested boxes.
const toneClasses: Record<ChipData['tone'], string> = {
  red: 'bg-red-soft text-red',
  amber: 'bg-amber-soft text-amber',
  blue: 'bg-accent-soft text-accent',
  neutral: 'bg-panel-2 text-muted',
};

export function Chip({ label, tone }: ChipData) {
  return (
    <span
      className={`rounded-full px-[8px] py-[2px] text-[10.5px] font-semibold ${toneClasses[tone]}`}
    >
      {label}
    </span>
  );
}
