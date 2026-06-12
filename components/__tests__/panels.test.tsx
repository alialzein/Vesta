import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MorningBrief } from '@/components/dashboard/MorningBrief';
import { AiCommandCenter } from '@/components/dashboard/AiCommandCenter';
import { AiAssistantRail } from '@/components/dashboard/AiAssistantRail';
import { ToastProvider } from '@/components/ui/Toast';
import { demoCommandCards, demoMorningBrief, demoWorkItems } from '@/lib/demo-data';

// The rail's Memory tab imports the Phase 10 memory actions (server-only).
vi.mock('@/app/actions/memories', () => ({
  addMemory: vi.fn(async () => ({ ok: true })),
  updateMemoryText: vi.fn(async () => ({ ok: true })),
  setMemoryActive: vi.fn(async () => ({ ok: true })),
  deleteMemory: vi.fn(async () => ({ ok: true })),
  approveMemory: vi.fn(async () => ({ ok: true })),
  rejectMemory: vi.fn(async () => ({ ok: true })),
}));

/** Some components use the toast context; wrap them in a provider. */
function renderWithToast(ui: ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe('MorningBrief', () => {
  it('renders the headline + summary with no score chip (the score lives on the radar card)', () => {
    render(<MorningBrief brief={demoMorningBrief} onAction={() => {}} />);
    expect(screen.getByText(demoMorningBrief.headline)).toBeInTheDocument();
    expect(screen.getByText(demoMorningBrief.summaryLine)).toBeInTheDocument();
    // Declutter pass: the "Top priority: N" chip duplicated the card badge.
    expect(screen.queryByText(/Top priority:/i)).not.toBeInTheDocument();
  });

  it('offers no Meeting Prep button (removed until real meeting prep ships)', () => {
    render(<MorningBrief brief={demoMorningBrief} onAction={() => {}} />);
    expect(screen.queryByRole('button', { name: /Meeting Prep/i })).not.toBeInTheDocument();
  });

  it('shows LIVE queue numbers from props (never from cached AI text), zeros hidden', () => {
    render(
      <MorningBrief
        brief={demoMorningBrief}
        onAction={() => {}}
        stats={{ open: 5, overdue: 2, waiting: 1 }}
      />,
    );
    expect(screen.getByText('5 open')).toBeInTheDocument();
    expect(screen.getByText('2 overdue')).toBeInTheDocument();
    expect(screen.getByText('1 waiting on you')).toBeInTheDocument();
  });

  it('hides zero facts ("0 overdue" is noise) and the whole line on an empty queue', () => {
    const { rerender } = render(
      <MorningBrief
        brief={demoMorningBrief}
        onAction={() => {}}
        stats={{ open: 3, overdue: 0, waiting: 0 }}
      />,
    );
    expect(screen.getByText('3 open')).toBeInTheDocument();
    expect(screen.queryByText(/overdue/)).not.toBeInTheDocument();

    rerender(
      <MorningBrief
        brief={demoMorningBrief}
        onAction={() => {}}
        stats={{ open: 0, overdue: 0, waiting: 0 }}
      />,
    );
    expect(screen.queryByText(/0 open/)).not.toBeInTheDocument();
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

    // Header context: title + the sender meta line (name · email) are visible.
    expect(screen.getByText(item.title)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(item.person!))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(item.personEmail!))).toBeInTheDocument();
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

  it('offers no Delegate button (dead buttons removed; the sidebar Soon row carries the roadmap)', () => {
    const item = demoWorkItems[0];
    renderWithToast(<AiAssistantRail item={item} activeTab="action" onTabChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /^Delegate$/i })).not.toBeInTheDocument();
  });

  it('shows no second LIVE badge and no context grid repeating the card', () => {
    const item = demoWorkItems[0];
    renderWithToast(<AiAssistantRail item={item} activeTab="action" onTabChange={() => {}} />);
    // The brief is the dashboard's one live surface.
    expect(screen.queryByText(/^Live$/i)).not.toBeInTheDocument();
    // The old Source/Category cells repeated what the clicked card already says.
    expect(screen.queryByText(/^Source$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Category$/i)).not.toBeInTheDocument();
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

