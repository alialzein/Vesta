import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';

// The shell navigates (Ask Vesta FAB prefetch, collapsed-rail chat); jsdom has
// no app router, so mock it (same pattern as the AppShell test).
const push = vi.fn();
const prefetch = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, prefetch, refresh: vi.fn() }),
  usePathname: () => '/',
}));

// AutoSync runs background server actions on mount; stub it out so this shell
// test stays isolated (its logic is covered by lib/sync/__tests__/auto.test.ts).
vi.mock('@/components/sync/AutoSync', () => ({ AutoSync: () => null }));
// TimezoneSync reports the device timezone via a server action — same deal.
vi.mock('@/components/sync/TimezoneSync', () => ({ TimezoneSync: () => null }));

// The radar action server functions pull in server-only modules (React cache,
// the Supabase server client). Stub them so the client shell renders in jsdom.
vi.mock('@/app/actions/work-items', () => ({
  resolveWorkItem: vi.fn(async () => ({ ok: true })),
  snoozeWorkItem: vi.fn(async () => ({ ok: true })),
  createManualTask: vi.fn(async () => ({ ok: true })),
  createTaskWithAi: vi.fn(async () => ({ ok: true })),
}));

// The draft composer imports server-only draft actions; stub them so the client
// shell renders in jsdom (their logic is covered by the drafts/email/graph tests).
vi.mock('@/app/actions/drafts', () => ({
  generateDraft: vi.fn(async () => ({ ok: true })),
  ensureBlankDraft: vi.fn(async () => ({ ok: true })),
  saveDraft: vi.fn(async () => ({ ok: true })),
  sendDraft: vi.fn(async () => ({ ok: true })),
  discardDraft: vi.fn(async () => ({ ok: true })),
}));

// Phase 11 — the daily-brief server action fires once on mount; keep it inert
// here (its prompt/parser logic is covered by lib/ai/__tests__/brief.test.ts).
vi.mock('@/app/actions/brief', () => ({
  generateDailyBrief: vi.fn(async () => ({ ok: false, reason: 'mocked out' })),
}));

// The chat dock talks to the real chat backend; stub it (its logic is covered
// by lib/ai/__tests__/chat.test.ts and the ChatDock/ChatView suites).
vi.mock('@/app/actions/chat', () => ({
  sendChatMessage: vi.fn(async () => ({ ok: false, error: 'mocked out' })),
  deleteChatConversation: vi.fn(async () => ({ ok: true })),
  executeChatAction: vi.fn(async () => ({ ok: true, result: 'done' })),
  cancelChatAction: vi.fn(async () => ({ ok: true })),
}));
vi.mock('@/app/actions/people', () => ({
  suggestAttendees: vi.fn(async () => []),
}));

// MemoryView + the rail's Memory tab import the Phase 10 memory actions.
vi.mock('@/app/actions/memories', () => ({
  addMemory: vi.fn(async () => ({ ok: true })),
  updateMemoryText: vi.fn(async () => ({ ok: true })),
  setMemoryActive: vi.fn(async () => ({ ok: true })),
  deleteMemory: vi.fn(async () => ({ ok: true })),
  approveMemory: vi.fn(async () => ({ ok: true })),
  rejectMemory: vi.fn(async () => ({ ok: true })),
}));

function renderDashboard() {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <DashboardClient />
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe('DashboardClient shell', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to the dark theme', () => {
    renderDashboard();
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('toggles the theme to light and back', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /Switch to light mode/i }));
    expect(document.documentElement.dataset.theme).toBe('light');

    await user.click(screen.getByRole('button', { name: /Switch to dark mode/i }));
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('shows the Today view with the brief and radar, focused on work', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: /Good morning/i })).toBeInTheDocument();
    expect(screen.getByText(/Live morning brief/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Today's Radar/i })).toBeInTheDocument();
  });

  it('does not show the large AI Command Center cards on the main dashboard', () => {
    renderDashboard();
    expect(screen.queryByRole('heading', { name: /AI Command Center/i })).not.toBeInTheDocument();
  });

  it('switches to the Memory & Rules view from the sidebar', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /^Memory & Rules$/i }));

    expect(screen.getByRole('heading', { name: /^Memory & Rules$/i })).toBeInTheDocument();
    expect(screen.queryByText("Today's Radar")).not.toBeInTheDocument();
  });

  it('the floating button opens the mini chat dock over the dashboard', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // The sidebar Ask Vesta item stays a real link to the full-screen view.
    expect(screen.getByRole('link', { name: /Ask Vesta/i })).toHaveAttribute('href', '/chat');

    await user.click(screen.getByRole('button', { name: 'Ask Vesta' }));
    // The dock is open with its composer — and the radar is still on screen
    // behind it (non-modal: the manager can keep acting on items).
    expect(screen.getByPlaceholderText('Ask Vesta anything…')).toBeVisible();
    expect(screen.getByRole('heading', { name: /Today's Radar/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Close mini chat' }));
    expect(screen.getByRole('button', { name: 'Ask Vesta' })).toBeInTheDocument();
  });

  it('collapses and expands the sidebar without losing nav access', async () => {
    const user = userEvent.setup();
    renderDashboard();

    expect(screen.getByText(/Your work, in order/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Collapse sidebar/i }));
    expect(screen.queryByText(/Your work, in order/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Memory & Rules/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Expand sidebar/i }));
    expect(screen.getByText(/Your work, in order/i)).toBeInTheDocument();
  });

  it('collapses the AI rail from its panel header and re-expands from the icon strip', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // Expanded rail tabs are present.
    expect(screen.getAllByRole('tab', { name: /Draft/i }).length).toBeGreaterThan(0);

    // Collapse via the toggle inside the AI panel header.
    await user.click(screen.getByRole('button', { name: /Collapse AI assistant rail/i }));

    // Collapsed strip exposes a Draft icon button; clicking it re-expands so the
    // panel header collapse control is back.
    await user.click(screen.getByRole('button', { name: 'Draft' }));
    expect(screen.getByRole('button', { name: /Collapse AI assistant rail/i })).toBeInTheDocument();
  });

  it('updates the rail when a different radar item is selected', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const row = screen.getByText('Hiring decision follow-up').closest('button')!;
    await user.click(row);

    expect(screen.getAllByText('Hiring decision follow-up').length).toBeGreaterThan(1);
  });

  it('keeps the Morning Brief quick actions to what is real (no Delegate, no Meeting Prep)', () => {
    renderDashboard();
    const brief = screen.getByText(/Live morning brief/i).closest('section')!;
    expect(within(brief).queryByRole('button', { name: 'Delegate' })).not.toBeInTheDocument();
    // Meeting Prep opened a demo drawer — removed until real prep ships (Phase C calendar).
    expect(within(brief).queryByRole('button', { name: /Meeting Prep/ })).not.toBeInTheDocument();
    // The compact quick actions that remain.
    expect(within(brief).getByRole('button', { name: 'Clear My Day' })).toBeInTheDocument();
    expect(within(brief).getByRole('button', { name: 'Draft Replies' })).toBeInTheDocument();
  });

  it('filters the radar to delegatable work via the radar "Can delegate" chip (with its count)', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('tab', { name: /Can delegate/ }));

    const delegateTab = screen.getByRole('tab', { name: /Can delegate/ });
    expect(delegateTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('IT laptop purchase request')).toBeInTheDocument();
    expect(screen.queryByText('Board meeting preparation')).not.toBeInTheDocument();
  });

  it('"Clear My Day" opens the real full-screen Focus Mode and Escape exits it', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Clear My Day' }));
    const focus = screen.getByRole('dialog', { name: /Focus Mode/ });
    expect(focus).toBeInTheDocument();
    // One item at a time, with the real action set.
    expect(within(focus).getByRole('button', { name: /Mark done/ })).toBeInTheDocument();
    expect(within(focus).getByText(/of \d+ handled/)).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /Focus Mode/ })).not.toBeInTheDocument();
  });

  it('offers no Delegate button anywhere on the Today view (dead buttons removed)', () => {
    renderDashboard();
    expect(screen.queryByRole('button', { name: /^Delegate$/i })).not.toBeInTheDocument();
  });

  it('has no sidebar Follow-ups button (that slice lives in the radar filter chips)', () => {
    renderDashboard();
    expect(screen.queryByRole('button', { name: /Follow-ups/ })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Follow-ups/ })).toBeInTheDocument();
  });

  it('clicking Today in the sidebar resets the radar filter to All', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('tab', { name: /Follow-ups/ }));
    expect(screen.queryByText('IT laptop purchase request')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Today/ }));
    expect(screen.getByRole('tab', { name: /^All/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('IT laptop purchase request')).toBeInTheDocument();
  });

  it('opens directly on Memory & Rules when deep-linked (/?view=memory)', () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <DashboardClient initialView="memory" />
        </ToastProvider>
      </ThemeProvider>,
    );
    expect(screen.getByRole('heading', { name: /^Memory & Rules$/i })).toBeInTheDocument();
    expect(screen.queryByText("Today's Radar")).not.toBeInTheDocument();
  });

  it('sidebar Draft Replies and Weekly Review are real links', () => {
    renderDashboard();
    expect(screen.getByRole('link', { name: /Draft Replies/ })).toHaveAttribute(
      'href',
      '/drafts',
    );
    expect(screen.getByRole('link', { name: /Weekly Review/ })).toHaveAttribute(
      'href',
      '/weekly-review',
    );
  });

  it('sidebar Delegation is an honest Soon row, not a dead button', () => {
    renderDashboard();
    expect(screen.getByText('Delegation')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delegation/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Delegation/ })).not.toBeInTheDocument();
    // The roadmap pill sits next to the label.
    expect(screen.getByText('Delegation').parentElement?.textContent).toContain('Soon');
  });

  it('pre-selects the deep-linked work item (Drafts page → composer handoff)', () => {
    render(
      <ThemeProvider>
        <ToastProvider>
          <DashboardClient initialItemId="wi-hiring" />
        </ToastProvider>
      </ThemeProvider>,
    );
    // Selected items render in the radar AND the rail.
    expect(screen.getAllByText('Hiring decision follow-up').length).toBeGreaterThan(1);
  });

  it('renders the full-page Memory & Rules workspace with category tabs and add form', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /^Memory & Rules$/i }));

    // Add form + category filter tabs are present (full-page layout).
    expect(screen.getByLabelText('New memory text')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /VIPs & People/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Safety \/ Never/i })).toBeInTheDocument();
  });
});
