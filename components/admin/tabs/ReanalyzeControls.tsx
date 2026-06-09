'use client';

import { ActionButton } from '@/components/admin/ActionButton';
import { adminReanalyze } from '@/app/(admin)/admin/actions';

export function ReanalyzeControls() {
  return (
    <ActionButton
      subtle
      confirm="Clear last_analyzed_at on all open items so AI re-analyzes them on the next sync? Use after a prompt or model change. Costs tokens."
      run={() => adminReanalyze()}
    >
      Re-analyze all
    </ActionButton>
  );
}
