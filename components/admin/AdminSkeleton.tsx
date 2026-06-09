/**
 * Theme-aware skeleton rendered by each admin route's loading.tsx, so navigating
 * between operator tabs shows an instant placeholder (per the nav-perf rule)
 * instead of a frozen screen. No <main> wrapper — it sits inside the shell's main.
 */
export function AdminSkeleton({ kpis = 4, rows = 6 }: { kpis?: number; rows?: number }) {
  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <div className="h-6 w-48 animate-pulse rounded-md bg-panel-2" />
        <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded bg-panel-2" />
      </div>

      <div className="mb-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: kpis }).map((_, i) => (
          <div key={i} className="h-[92px] animate-pulse rounded-[13px] border border-line bg-panel" />
        ))}
      </div>

      <div className="overflow-hidden rounded-[14px] border border-line bg-panel">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 border-b border-line/60 px-3 py-3">
            <div className="h-4 w-1/4 animate-pulse rounded bg-panel-2" />
            <div className="h-4 w-1/5 animate-pulse rounded bg-panel-2" />
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-panel-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
