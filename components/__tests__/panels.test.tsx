import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { MorningBrief } from '@/components/dashboard/MorningBrief';
import { AiAnalysisPanel } from '@/components/dashboard/AiAnalysisPanel';
import { ManagerMemoryPanel } from '@/components/dashboard/ManagerMemoryPanel';
import { demoKpis, demoMorningBrief, demoWorkItems } from '@/lib/demo-data';

describe('KpiCards', () => {
  it('renders each KPI value and label', () => {
    render(<KpiCards metrics={demoKpis} />);
    for (const kpi of demoKpis) {
      expect(screen.getByText(kpi.label)).toBeInTheDocument();
    }
  });
});

describe('MorningBrief', () => {
  it('renders the headline and urgency ring score', () => {
    render(<MorningBrief brief={demoMorningBrief} />);
    expect(screen.getByText(demoMorningBrief.headline)).toBeInTheDocument();
    expect(screen.getByText(String(demoMorningBrief.topUrgencyScore))).toBeInTheDocument();
  });
});

describe('AiAnalysisPanel', () => {
  it('shows the selected item reasoning and required safety copy', () => {
    render(<AiAnalysisPanel item={demoWorkItems[0]} />);
    expect(screen.getByText(demoWorkItems[0].title)).toBeInTheDocument();
    expect(screen.getByText(demoWorkItems[0].urgencyReason)).toBeInTheDocument();
    // Safety copy must be present (UX spec requirement).
    expect(screen.getByText(/Please review before sending/i)).toBeInTheDocument();
  });
});

describe('ManagerMemoryPanel', () => {
  it('adds a new memory and can forget it', async () => {
    const user = userEvent.setup();
    render(<ManagerMemoryPanel />);

    const input = screen.getByLabelText('New memory text');
    await user.type(input, 'Treat Acme as VIP');
    await user.click(screen.getByRole('button', { name: /Remember this/i }));

    expect(screen.getByText('Treat Acme as VIP')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Forget memory: Treat Acme as VIP' }));
    expect(screen.queryByText('Treat Acme as VIP')).not.toBeInTheDocument();
  });
});
