'use client';

import { useEffect, useState } from 'react';
import type { KpiMetric, MorningBrief as MorningBriefData, RailTab, WorkItem } from '@/lib/types';
import { demoCommandCards, demoKpis, demoMorningBrief, demoWorkItems } from '@/lib/demo-data';
import { priorityBand } from '@/lib/priority';
import { useToast } from '@/components/ui/Toast';
import { Sidebar, type NavView } from './Sidebar';
import { Topbar } from './Topbar';
import { MorningBrief } from './MorningBrief';
import { HiddenNudge } from './HiddenNudge';
// AiCommandCenter is reserved for a future expanded-actions page; it is no
// longer rendered on the main Today dashboard (Phase 0.3). Kept + flag-gated.
import { AiCommandCenter } from './AiCommandCenter';
import { MetricsStrip } from './MetricsStrip';
import { TodaysRadar, type RadarFilter } from './TodaysRadar';
import { HowItWorks } from './HowItWorks';
import { AiAssistantRail } from './AiAssistantRail';
import { CollapsedRail } from './CollapsedRail';
import { MemoryView } from './MemoryView';
import { AssistantChat } from './AssistantChat';
import { FocusModeDrawer } from './FocusModeDrawer';
import { MeetingPrepDrawer } from './MeetingPrepDrawer';
import { CleanInboxDrawer } from './CleanInboxDrawer';
import { VestaSplashScreen } from './VestaSplashScreen';
import { DashboardAtmosphere } from './DashboardAtmosphere';
import { AutoSync } from '@/components/sync/AutoSync';
import { Icon } from '@/components/ui/Icon';
import type { AccountView } from '@/lib/supabase/account';

/**
 * Demo feature flag (Phase 0.3): the large AI Command Center gradient cards are
 * hidden on the main Today page to keep the work queue the focus. The component
 * is kept for a possible future "expanded actions" page. Flip to true to show.
 */
const SHOW_LARGE_COMMAND_CENTER = false;

/**
 * Owns the dashboard shell state:
 * - selected work item (Radar -> AI Assistant Rail)
 * - active main view (today | memory)
 * - sidebar collapsed (full <-> icon rail) + mobile drawer
 * - right rail collapsed (panel <-> slim icon strip) + active tab
 * - controlled radar filter (so quick actions can drive it)
 * - quick-action preview drawers + chat drawer
 *
 * All data is demo data (lib/demo-data.ts). No network/DB/AI calls.
 * Quick actions are local React behavior only — see docs/demo/demo-behavior.md.
 */
export function DashboardClient({
  account,
  showSplashInitially = false,
  workItems = demoWorkItems,
  kpis = demoKpis,
  brief = demoMorningBrief,
  hiddenCount = 0,
}: {
  account?: AccountView;
  /** Server decides (cookie-gated) so the splash plays once per session, not on
   * every navigation back to the dashboard. Defaults off (e.g. component tests). */
  showSplashInitially?: boolean;
  /** Real work_items + the metrics/brief derived from them; default to demo data
   *  (used by component tests and as a safe fallback). */
  workItems?: WorkItem[];
  kpis?: KpiMetric[];
  brief?: MorningBriefData;
  /** Inbound mail triage hid this week — drives the "review hidden" nudge. */
  hiddenCount?: number;
} = {}) {
  const { showToast } = useToast();

  // Branded initialization splash (Phase 0.5). Plays once on login: the sign-in
  // redirect lands on the dashboard with ?splash=1, which we strip from the URL
  // on mount so it never replays on internal navigation. Default off (tests).
  const [showSplash, setShowSplash] = useState(showSplashInitially);

  // Strip the one-shot ?splash=1 from the URL as soon as we mount, so a refresh
  // or back-navigation to the dashboard never replays the splash.
  useEffect(() => {
    if (!showSplashInitially) return;
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      /* non-blocking */
    }
  }, [showSplashInitially]);

  const [selected, setSelected] = useState<WorkItem | undefined>(workItems[0]);
  const [view, setView] = useState<NavView>('today');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [railTab, setRailTab] = useState<RailTab>('action');
  const [radarFilter, setRadarFilter] = useState<RadarFilter>('all');
  const [chatOpen, setChatOpen] = useState(false);

  // Quick-action preview drawers (demo only).
  const [focusOpen, setFocusOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [cleanOpen, setCleanOpen] = useState(false);

  /** Called when the splash finishes its timed sequence. */
  function handleSplashDone() {
    setShowSplash(false);
  }

  const onToday = view === 'today';
  const highPriority = selected ? priorityBand(selected.priorityScore) === 'red' : false;
  // When the expanded rail is showing on desktop, keep the chat FAB subtle.
  const railExpanded = onToday && !railCollapsed;

  /** Expand the rail and (optionally) jump to a specific tab. */
  function expandRail(tab?: RailTab) {
    if (tab) setRailTab(tab);
    setRailCollapsed(false);
  }

  /** Quick actions — demo-only local behavior. */
  function handleCommand(cardId: string) {
    switch (cardId) {
      case 'cmd-clear-day':
        setFocusOpen(true);
        break;
      case 'cmd-meeting-prep':
        setMeetingOpen(true);
        break;
      case 'cmd-delegate':
        // Filter Today's Radar to delegatable work and nudge the user there.
        setRadarFilter('delegate');
        showToast('Showing tasks you can delegate. Pick one to draft the handoff.');
        break;
      case 'cmd-clean-inbox':
        setCleanOpen(true);
        break;
    }
  }

  return (
    <>
      {showSplash && <VestaSplashScreen onDone={handleSplashDone} />}

      {/* Background auto-sync (Phase 5): keeps mail fresh without manual "Sync now". */}
      <AutoSync />

      {/* Subtle Vesta atmosphere behind everything (decorative, z-0). */}
      <DashboardAtmosphere />

      <div
        className={[
          // grid-rows-[minmax(0,1fr)] constrains the single row to the viewport
          // height so the inner scroll containers (main / rail) actually scroll
          // instead of overflowing a body that is overflow:hidden.
          'relative grid h-screen w-screen grid-cols-1 grid-rows-[minmax(0,1fr)] gap-4 p-3 transition-[grid-template-columns] duration-300 sm:p-4',
          sidebarCollapsed
            ? 'lg:grid-cols-[88px_minmax(0,1fr)]'
            : 'lg:grid-cols-[280px_minmax(0,1fr)]',
        ].join(' ')}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
          activeView={view}
          onSelectView={setView}
          mobileOpen={sidebarMobileOpen}
          onCloseMobile={() => setSidebarMobileOpen(false)}
          account={account}
        />

        {/* Content area: main + optional right rail */}
        <div
          className={[
            'relative z-[1] grid min-h-0 min-w-0 grid-cols-1 grid-rows-[minmax(0,1fr)] gap-4 transition-[grid-template-columns] duration-300',
            // Rail only joins the grid at xl+; below that the work queue takes
            // the full width (Option A — rail returns on wide screens).
            onToday
              ? railCollapsed
                ? 'xl:grid-cols-[minmax(0,1fr)_64px]'
                : 'xl:grid-cols-[minmax(0,1fr)_400px]'
              : 'xl:grid-cols-[minmax(0,1fr)]',
          ].join(' ')}
        >
          {/* Main column */}
          <main className="v-scroll flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto pr-1">
            <Topbar onOpenSidebar={() => setSidebarMobileOpen(true)} account={account} />

            {onToday ? (
              <>
                <MorningBrief
                  brief={brief}
                  onAction={(action) => {
                    if (action === 'focus') handleCommand('cmd-clear-day');
                    else if (action === 'meeting') handleCommand('cmd-meeting-prep');
                    else
                      showToast('Demo: Vesta would prepare reply drafts for your approval here.');
                  }}
                />

                <HiddenNudge count={hiddenCount} />

                {SHOW_LARGE_COMMAND_CENTER && (
                  <AiCommandCenter cards={demoCommandCards} onCardAction={handleCommand} />
                )}

                <MetricsStrip metrics={kpis} />

                <TodaysRadar
                  items={workItems}
                  selectedId={selected?.id ?? null}
                  onSelect={setSelected}
                  filter={radarFilter}
                  onFilterChange={setRadarFilter}
                />

                <HowItWorks />
              </>
            ) : (
              <MemoryView />
            )}
          </main>

          {/* Right rail — wide screens only (xl+); expanded panel or slim icon strip.
              Hidden when nothing is selected (e.g. an empty work queue). */}
          {onToday && selected && (
            <aside className="v-scroll hidden min-h-0 min-w-0 flex-col gap-4 overflow-y-auto pr-[2px] xl:flex">
              {railCollapsed ? (
                <CollapsedRail
                  highPriority={highPriority}
                  onExpand={expandRail}
                  onOpenChat={() => setChatOpen(true)}
                />
              ) : (
                <AiAssistantRail
                  item={selected}
                  activeTab={railTab}
                  onTabChange={setRailTab}
                  onCollapse={() => setRailCollapsed(true)}
                />
              )}
            </aside>
          )}
        </div>
      </div>

      {/* Floating chat button — bottom-right. Compact (icon-only) while the AI
          rail is expanded so it does not compete with the rail. */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          title="Ask Vesta"
          aria-label="Open Vesta assistant"
          className={[
            'group fixed bottom-6 right-6 z-50 flex h-14 items-center gap-3 rounded-full border border-line-strong bg-[radial-gradient(circle_at_30%_20%,var(--accent),var(--accent-2))] text-white shadow-[0_14px_34px_rgba(47,125,235,.45)] transition hover:scale-[1.03]',
            railExpanded ? 'pl-4 pr-5 xl:w-14 xl:justify-center xl:px-0' : 'pl-4 pr-5',
          ].join(' ')}
        >
          <Icon name="chat" className="h-5 w-5" />
          <span
            className={[
              'font-display text-[15px] font-semibold',
              railExpanded ? 'inline xl:hidden' : 'inline',
            ].join(' ')}
          >
            Ask Vesta
          </span>
        </button>
      )}

      {/* Chat drawer */}
      <AssistantChat open={chatOpen} onClose={() => setChatOpen(false)} />

      {/* Quick-action preview drawers (demo only) */}
      <FocusModeDrawer open={focusOpen} onClose={() => setFocusOpen(false)} items={demoWorkItems} />
      <MeetingPrepDrawer open={meetingOpen} onClose={() => setMeetingOpen(false)} />
      <CleanInboxDrawer open={cleanOpen} onClose={() => setCleanOpen(false)} />
    </>
  );
}
