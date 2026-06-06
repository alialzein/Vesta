import { ManagerMemoryPanel } from './ManagerMemoryPanel';

/**
 * Main-area "Memory & Rules" view (shown when that left-nav item is active).
 * Wraps the memory manager with a heading + the required safety copy.
 */
export function MemoryView() {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="m-0 font-display text-[26px] font-semibold tracking-tight">
          Memory &amp; Rules
        </h2>
        <p className="mt-2 max-w-[640px] text-sm leading-relaxed text-muted">
          Teach Vesta who matters, how you prefer replies, and what to delegate. The assistant uses
          these every time it prioritises and drafts. This memory affects future prioritization —
          you can edit or delete it anytime.
        </p>
      </div>

      <div className="max-w-[640px]">
        <ManagerMemoryPanel />
      </div>
    </section>
  );
}
