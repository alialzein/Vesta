/**
 * Theme-aware loading skeleton for the centered list pages (Inbox, Priorities,
 * Settings). Rendered by each route's `loading.tsx`, so navigation shows an
 * instant placeholder while the server work runs instead of a frozen screen.
 *
 * Uses the panel/line theme tokens so it matches the real cards and works in
 * both light and dark mode (per the UI rules). No real data; aria-hidden.
 */
export function PageSkeleton({
  maxWidth = '820px',
  rows = 5,
  rowHeight = 92,
}: {
  maxWidth?: string;
  rows?: number;
  rowHeight?: number;
}) {
  return (
    <main
      className="v-scroll mx-auto h-screen w-full overflow-y-auto px-5 py-8"
      style={{ maxWidth }}
      aria-hidden="true"
    >
      {/* Header: back button + title + subtitle + a right-aligned action. */}
      <div className="mb-6 flex items-center gap-3">
        <div className="h-9 w-9 flex-none animate-pulse rounded-[11px] border border-line bg-panel-2" />
        <div className="flex-1">
          <div className="h-6 w-44 max-w-[60%] animate-pulse rounded-md bg-panel-2" />
          <div className="mt-2 h-3 w-64 max-w-full animate-pulse rounded bg-panel-2" />
        </div>
        <div className="hidden h-9 w-28 flex-none animate-pulse rounded-[11px] border border-line bg-panel-2 sm:block" />
      </div>

      {/* Card rows */}
      <div className="flex flex-col gap-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-[14px] border border-line bg-panel p-4 shadow-soft"
            style={{ height: rowHeight }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="h-[14px] w-40 max-w-[55%] rounded bg-panel-2" />
              <div className="h-3 w-16 flex-none rounded bg-panel-2" />
            </div>
            <div className="mt-3 h-[14px] w-3/4 rounded bg-panel-2" />
            <div className="mt-2 h-3 w-1/2 rounded bg-panel-2" />
          </div>
        ))}
      </div>
    </main>
  );
}
