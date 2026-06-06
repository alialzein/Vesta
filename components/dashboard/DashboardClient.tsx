'use client';

import { useState } from 'react';
import type { WorkItem } from '@/lib/types';
import { demoKpis, demoMorningBrief, demoWorkItems } from '@/lib/demo-data';
import { Sidebar, type NavView } from './Sidebar';
import { Topbar } from './Topbar';
import { MorningBrief } from './MorningBrief';
import { KpiCards } from './KpiCards';
import { TodaysRadar } from './TodaysRadar';
import { HowItWorks } from './HowItWorks';
import { AiAnalysisPanel } from './AiAnalysisPanel';
import { MemoryView } from './MemoryView';
import { AssistantChat } from './AssistantChat';
import { Icon } from '@/components/ui/Icon';

/**
 * Owns the dashboard shell state:
 * - selected work item (Radar -> AI Analysis)
 * - active main view (today | memory)
 * - sidebar collapsed (full <-> icon-only rail)
 * - right rail (AI Analysis) collapsed
 * - chat drawer open
 *
 * All data is demo data (lib/demo-data.ts). No network/DB/AI calls.
 */
export function DashboardClient() {
  const [selected, setSelected] = useState<WorkItem>(demoWorkItems[0]);
  const [view, setView] = useState<NavView>('today');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const showRail = view === 'today' && !railCollapsed;

  return (
    <>
      <div
        className={[
          'grid h-screen w-screen grid-cols-1 gap-4 p-4 transition-[grid-template-columns] duration-300',
          sidebarCollapsed
            ? 'lg:grid-cols-[84px_minmax(0,1fr)]'
            : 'lg:grid-cols-[250px_minmax(0,1fr)]',
        ].join(' ')}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
          activeView={view}
          onSelectView={setView}
        />

        {/* Content area: main + optional right rail */}
        <div
          className={[
            'grid min-w-0 gap-4 transition-[grid-template-columns] duration-300',
            showRail ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : 'lg:grid-cols-[minmax(0,1fr)]',
            'grid-cols-1',
          ].join(' ')}
        >
          {/* Main column */}
          <main className="v-scroll flex min-w-0 flex-col gap-4 overflow-y-auto pr-1">
            <Topbar
              showRailToggle={view === 'today'}
              railCollapsed={railCollapsed}
              onToggleRail={() => setRailCollapsed((c) => !c)}
            />

            {view === 'today' ? (
              <>
                <MorningBrief brief={demoMorningBrief} />
                <KpiCards metrics={demoKpis} />
                <TodaysRadar
                  items={demoWorkItems}
                  selectedId={selected.id}
                  onSelect={setSelected}
                />
                <HowItWorks />
              </>
            ) : (
              <MemoryView />
            )}
          </main>

          {/* Right rail — AI Analysis only, only on Today view */}
          {showRail && (
            <aside className="v-scroll hidden min-w-0 flex-col gap-4 overflow-y-auto pr-[2px] lg:flex">
              <AiAnalysisPanel item={selected} />
            </aside>
          )}
        </div>
      </div>

      {/* Floating chat button — bottom-right, always available */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          title="Ask Vesta"
          aria-label="Open Vesta assistant"
          className="group fixed bottom-6 right-6 z-50 flex h-14 items-center gap-3 rounded-full border border-line-strong bg-[radial-gradient(circle_at_30%_20%,var(--accent),var(--accent-2))] pl-4 pr-5 text-white shadow-[0_14px_34px_rgba(91,168,245,.5)] transition hover:scale-[1.03]"
        >
          <Icon name="chat" className="h-5 w-5" />
          <span className="font-display text-[15px] font-semibold">Ask Vesta</span>
        </button>
      )}

      {/* Chat drawer */}
      <AssistantChat open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
}
