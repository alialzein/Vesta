/**
 * Instant, theme-aware skeleton for the user-guide site (per the navigation
 * rule). Mirrors the DocsShell layout — top bar, left sidebar, reading column —
 * so a click shows structure immediately instead of a blank screen. aria-hidden;
 * both light and dark via theme tokens.
 */
export default function UserGuideLoading() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg" aria-hidden="true">
      <div className="flex h-[60px] flex-none items-center gap-3 border-b border-line px-4 sm:px-6">
        <div className="h-8 w-8 animate-pulse rounded-[10px] bg-panel-2" />
        <div className="h-4 w-24 animate-pulse rounded bg-panel-2" />
        <div className="ml-auto h-9 w-24 animate-pulse rounded-full bg-panel-2" />
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[288px] flex-none border-r border-line p-4 lg:block">
          <div className="space-y-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-8 w-full animate-pulse rounded-[10px] bg-panel-2" />
            ))}
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-hidden">
          <div className="mx-auto w-full max-w-[760px] px-5 py-10 sm:px-8 sm:py-12">
            <div className="h-3 w-28 animate-pulse rounded bg-panel-2" />
            <div className="mt-4 h-9 w-3/5 animate-pulse rounded-md bg-panel-2" />
            <div className="mt-3 h-4 w-4/5 animate-pulse rounded bg-panel-2" />
            <div className="mt-10 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded bg-panel-2"
                  style={{ width: `${[96, 88, 92, 70, 95, 84, 90, 60][i]}%` }}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
