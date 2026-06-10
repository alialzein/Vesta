import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MetricsStrip } from '@/components/dashboard/MetricsStrip';
import { MorningBrief } from '@/components/dashboard/MorningBrief';
import { AiCommandCenter } from '@/components/dashboard/AiCommandCenter';
import { AiAssistantRail } from '@/components/dashboard/AiAssistantRail';
import { ManagerMemoryPanel } from '@/components/dashboard/ManagerMemoryPanel';
import { ToastProvider } from '@/components/ui/Toast';
import { demoCommandCards, demoKpis, demoMorningBrief, demoWorkItems } from '@/lib/demo-data';

/** Some components use the toast context; wrap them in a provider. */
function renderWithToast(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('MetricsStrip', () => {
  it('renders every metric label', () => {
    render(<MetricsStrip metrics={demoKpis} />);
    for (const kpi of demoKpis) {
      expect(screen.getByText(kpi.label)).toBeInTheDocument();
    }
  });
});

describe('MorningBrief', () => {
  it('renders the headline and a compact top-priority chip (no large ring)', () => {
    render(<MorningBrief brief={demoMorningBrief} onAction={() => {}} />);
    expect(screen.getByText(demoMorningBrief.headline)).toBeInTheDocument();
    expect(
      screen.getByText(`Top priority: ${demoMorningBrief.topUrgencyScore}`),
    ).toBeInTheDocument();
  });

  it('reports the chosen quick action to the parent', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<MorningBrief brief={demoMorningBrief} onAction={onAction} />);
    await user.click(screen.getByRole('button', { name: /Clear My Day/i }));
    expect(onAction).toHaveBeenCalledWith('focus');
  });
});

describe('AiCommandCenter', () => {
  it('renders every command card and fires onCardAction when a CTA is clicked', async () => {
    const user = userEvent.setup();
    const onCardAction = vi.fn();
    render(<AiCommandCenter cards={demoCommandCards} onCardAction={onCardAction} />);

    expect(screen.getByRole('heading', { name: /AI Command Center/i })).toBeInTheDocument();
    for (const card of demoCommandCards) {
      expect(screen.getByText(card.title)).toBeInTheDocument();
    }

    await user.click(screen.getByRole('button', { name: /Start — Clear My Day/i }));
    expect(onCardAction).toHaveBeenCalledWith('cmd-clear-day');
  });
});

describe('AiAssistantRail', () => {
  it('shows item context, next best action, and switches tabs', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();
    const item = demoWorkItems[0];
    const { rerender } = renderWithToast(
      <AiAssistantRail item={item} activeTab="action" onTabChange={onTabChange} />,
    );

    // Header context: title + person are visible.
    expect(screen.getByText(item.title)).toBeInTheDocument();
    expect(screen.getByText(item.person!)).toBeInTheDocument();
    expect(screen.getByText(item.nextBestAction)).toBeInTheDocument();

    // Switching to the Draft tab is reported to the parent.
    await user.click(screen.getByRole('tab', { name: /Draft/i }));
    expect(onTabChange).toHaveBeenCalledWith('draft');

    // Render the draft tab for a repliable thread; assert the required safety copy
    // and the entry point into the composer are present.
    const onOpenDraft = vi.fn();
    rerender(
      <ToastProvider>
        <AiAssistantRail
          item={{ ...item, canDraft: true }}
          activeTab="draft"
          onTabChange={onTabChange}
          onOpenDraft={onOpenDraft}
        />
      </ToastProvider>,
    );
    expect(
      screen.getByText(/will not send emails without your explicit approval/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Draft a reply/i }));
    expect(onOpenDraft).toHaveBeenCalled();
  });

  it('shows an honest "coming soon" message when the Delegate action is clicked', async () => {
    const user = userEvent.setup();
    const item = demoWorkItems[0];
    renderWithToast(<AiAssistantRail item={item} activeTab="action" onTabChange={() => {}} />);

    await user.click(screen.getByRole('button', { name: /^Delegate$/i }));
    expect(screen.getByText(/delegation arrives in Phase 8/i)).toBeInTheDocument();
  });

  it('lists the memory/rules used on the Memory tab', () => {
    const item = demoWorkItems[0];
    renderWithToast(<AiAssistantRail item={item} activeTab="memory" onTabChange={() => {}} />);
    for (const memory of item.memoryUsed) {
      expect(screen.getByText(memory.text)).toBeInTheDocument();
    }
  });

  it('shows thread facts on the Activity tab', () => {
    const item = demoWorkItems[0];
    renderWithToast(<AiAssistantRail item={item} activeTab="activity" onTabChange={() => {}} />);
    expect(screen.getByText(item.activity[0].value)).toBeInTheDocument();
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
