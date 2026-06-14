/**
 * Instant, theme-aware skeleton for the dashboard ("/") — the one app route that
 * was missing a loading boundary (per the navigation rule). It lives in the
 * (home) route group so this dashboard-shaped skeleton only ever shows for the
 * dashboard, never for sibling top-level routes like /welcome or /login.
 *
 * Mirrors DashboardClient's frame — sidebar (lg+), top bar, Today's Radar cards,
 * and the right rail (xl+) — so a cold load shows structure instead of a blank
 * screen. aria-hidden; both light and dark via theme tokens.
 */
export default function DashboardLoading() {
  return (
    <div
      className="relative grid h-screen w-screen grid-cols-1 grid-rows-[minmax(0,1fr)] gap-4 bg-bg p-3 sm:p-4 lg:grid-cols-[280px_minmax(0,1fr)]"
      aria-hidden="true"
    >
      {/* Sidebar */}
      <aside className="hidden flex-col gap-3 rounded-[var(--radius)] border border-line bg-panel p-4 lg:flex">
        <div className="h-9 w-32 animate-pulse rounded-[10px] bg-panel-2" />
        <div className="mt-2 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-9 w-full animate-pulse rounded-[10px] bg-panel-2" />
          ))}
        </div>
        <div className="mt-auto h-12 w-full animate-pulse rounded-[12px] bg-panel-2" />
      </aside>

      {/* Content: main + right rail */}
      <div className="grid min-h-0 min-w-0 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <main className="flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden pr-1">
          {/* Top bar */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-[12px] bg-panel-2 lg:hidden" />
            <div className="h-8 w-44 max-w-[50%] animate-pulse rounded-md bg-panel-2" />
            <div className="ml-auto h-9 w-9 animate-pulse rounded-full bg-panel-2" />
            <div className="h-9 w-24 animate-pulse rounded-full bg-panel-2" />
          </div>

          {/* Morning brief band */}
          <div className="h-28 w-full flex-none animate-pulse rounded-[var(--radius)] border border-line bg-panel" />

          {/* Today's Radar cards */}
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-[16px] border border-line bg-panel p-4 shadow-soft"
                style={{ height: 96 }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="h-4 w-48 max-w-[55%] rounded bg-panel-2" />
                  <div className="h-3 w-16 flex-none rounded bg-panel-2" />
                </div>
                <div className="mt-3 h-3 w-3/4 rounded bg-panel-2" />
                <div className="mt-2 h-3 w-1/2 rounded bg-panel-2" />
              </div>
            ))}
          </div>
        </main>

        {/* Right rail (xl+) */}
        <aside className="hidden xl:block">
          <div className="h-full w-full animate-pulse rounded-[var(--radius)] border border-line bg-panel" />
        </aside>
      </div>
    </div>
  );
}
