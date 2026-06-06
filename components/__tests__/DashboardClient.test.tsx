import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { ThemeProvider } from '@/lib/theme';

function renderDashboard() {
  return render(
    <ThemeProvider>
      <DashboardClient />
    </ThemeProvider>,
  );
}

describe('DashboardClient shell', () => {
  it('shows the Today view by default with the morning brief', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: /Good morning/i })).toBeInTheDocument();
    expect(screen.getByText(/Live morning brief/i)).toBeInTheDocument();
  });

  it('switches to the Memory & Rules view from the sidebar', async () => {
    const user = userEvent.setup();
    renderDashboard();

    await user.click(screen.getByRole('button', { name: /Memory & Rules/i }));

    // Memory view heading appears; the radar leaves the document.
    expect(screen.getByRole('heading', { name: /^Memory & Rules$/i })).toBeInTheDocument();
    expect(screen.queryByText("Today's Radar")).not.toBeInTheDocument();
  });

  it('opens the chat drawer from the floating button and closes it', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // Closed initially: FAB visible, input not interactive yet.
    const fab = screen.getByRole('button', { name: /Open Vesta assistant/i });
    await user.click(fab);

    const input = screen.getByPlaceholderText('Ask the assistant anything…');
    expect(input).toBeVisible();

    await user.click(screen.getByRole('button', { name: /Close assistant/i }));
    // After closing, the FAB returns.
    expect(screen.getByRole('button', { name: /Open Vesta assistant/i })).toBeInTheDocument();
  });

  it('collapses and expands the sidebar', async () => {
    const user = userEvent.setup();
    renderDashboard();

    // Brand wordmark + role text visible when expanded.
    expect(screen.getByText('Managing Director')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Collapse sidebar/i }));
    expect(screen.queryByText('Managing Director')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Expand sidebar/i }));
    expect(screen.getByText('Managing Director')).toBeInTheDocument();
  });
});
