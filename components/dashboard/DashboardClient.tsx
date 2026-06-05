'use client';

import { useState } from 'react';
import type { WorkItem } from '@/lib/types';
import { demoKpis, demoMorningBrief, demoWorkItems } from '@/lib/demo-data';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MorningBrief } from './MorningBrief';
import { KpiCards } from './KpiCards';
import { TodaysRadar } from './TodaysRadar';
import { HowItWorks } from './HowItWorks';
import { AiAnalysisPanel } from './AiAnalysisPanel';
import { ManagerMemoryPanel } from './ManagerMemoryPanel';
import { AssistantChat } from './AssistantChat';
import { Icon, VestaMark } from '@/components/ui/Icon';

/**
 * Owns the small amount of cross-component state for the dashboard shell:
 * - which work item is selected (Radar -> AI Analysis panel)
 * - whether the assistant chat rail is open
 *
 * All data is demo data (lib/demo-data.ts). No network, DB, or AI calls.
 */
export function DashboardClient() {
  const [selected, setSelected] = useState<WorkItem>(demoWorkItems[0]);
  const [chatOpen, setChatOpen] = useState(true);

  return (
    <>
      <div
        className={[
          'grid h-screen w-screen gap-4 p-4 transition-[grid-template-columns] duration-300',
          chatOpen
            ? 'grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_392px]'
            : 'grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]',
        ].join(' ')}
      >
        <Sidebar />

        {/* Main column */}
        <main className="v-scroll flex min-w-0 flex-col gap-4 overflow-y-auto pr-1">
          <Topbar onToggleChat={() => setChatOpen((o) => !o)} />
          <MorningBrief brief={demoMorningBrief} />
          <KpiCards metrics={demoKpis} />
          <TodaysRadar items={demoWorkItems} selectedId={selected.id} onSelect={setSelected} />
          <HowItWorks />
        </main>

        {/* Right rail */}
        {chatOpen && (
          <section className="v-scroll flex min-w-0 flex-col gap-4 overflow-y-auto pr-[2px]">
            <AiAnalysisPanel item={selected} />
            <ManagerMemoryPanel />
            <AssistantChat onClose={() => setChatOpen(false)} />
          </section>
        )}
      </div>

      {/* Floating re-open button when chat collapsed */}
      {!chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          title="Open Vesta"
          aria-label="Open assistant"
          className="fixed bottom-6 right-6 z-50 grid h-[60px] w-[60px] place-items-center rounded-[18px] border-none bg-[radial-gradient(circle_at_50%_95%,#67e8d8,#5ba8f5_50%,var(--accent-2))] shadow-[0_14px_34px_rgba(91,168,245,.5)]"
        >
          <VestaMark className="h-[26px] w-[26px] text-white" />
          <Icon name="chat" className="hidden" />
        </button>
      )}
    </>
  );
}
