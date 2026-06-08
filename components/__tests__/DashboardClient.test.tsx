import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';

// AutoSync runs background server actions on mount; stub it out so this shell
// test stays isolated (its logic is covered by lib/sync/__tests__/auto.test.ts).
vi.mock('@/components/sync/AutoSync', () => ({ AutoSync: () => null }));

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

  it('opens the chat drawer from the floating button and closes it', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /Open Vesta assistant/i }));
    expect(screen.getByPlaceholderText('Ask the assistant anything…')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /Close assistant/i }));
    expect(screen.getByRole('button', { name: /Open Vesta assistant/i })).toBeInTheDocument();
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

  it('does not show a Delegate quick action in the Morning Brief', () => {
    renderDashboard();
    const brief = screen.getByText(/Live morning brief/i).closest('section')!;
    expect(within(brief).queryByRole('button', { name: 'Delegate' })).not.toBeInTheDocument();
    // The compact quick actions that remain.
    expect(within(brief).getByRole('button', { name: 'Clear My Day' })).toBeInTheDocument();
    expect(within(brief).getByRole('button', { name: 'Draft Replies' })).toBeInTheDocument();
    expect(within(brief).getByRole('button', { name: 'Meeting Prep' })).toBeInTheDocument();
  });

  it('filters the radar to delegatable work via the radar "Can delegate" tab', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('tab', { name: 'Can delegate' }));

    const delegateTab = screen.getByRole('tab', { name: 'Can delegate' });
    expect(delegateTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('IT laptop purchase request')).toBeInTheDocument();
    expect(screen.queryByText('Board meeting preparation')).not.toBeInTheDocument();
  });

  it('shows an honest "coming soon" message from the "Clear My Day" quick action', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: 'Clear My Day' }));
    expect(screen.getByText(/Focus Mode arrives in Phase 11/i)).toBeInTheDocument();
  });

  it('shows an honest "coming soon" message when a rail action button is used', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // Use the first visible "Approve Draft" action button in the rail.
    await user.click(screen.getAllByRole('button', { name: /^Approve Draft$/i })[0]);
    expect(screen.getByText(/AI draft replies arrive in Phase 9/i)).toBeInTheDocument();
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
