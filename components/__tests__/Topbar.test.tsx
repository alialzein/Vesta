import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Topbar } from '@/components/dashboard/Topbar';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';
import { DEMO_USER } from '@/lib/demo-data';

function renderTopbar() {
  const onOpenSidebar = vi.fn();
  render(
    <ThemeProvider>
      <ToastProvider>
        <Topbar onOpenSidebar={onOpenSidebar} />
      </ToastProvider>
    </ThemeProvider>,
  );
  return { onOpenSidebar };
}

describe('Topbar (Phase 0.4)', () => {
  it('does not render an AI-rail toggle (it lives in the AI panel now)', () => {
    renderTopbar();
    expect(screen.queryByRole('button', { name: /AI assistant rail/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^AI$/ })).not.toBeInTheDocument();
  });

  it('does not duplicate the profile chip (it lives in the sidebar footer)', () => {
    renderTopbar();
    expect(
      screen.queryByRole('button', { name: new RegExp(DEMO_USER.fullName, 'i') }),
    ).not.toBeInTheDocument();
  });

  it('does not show Outlook status in the topbar (moved to the sidebar footer)', () => {
    renderTopbar();
    expect(screen.queryByText(/Outlook Connected/i)).not.toBeInTheDocument();
  });

  it('renders the notification button without a fake unread count', () => {
    renderTopbar();
    const bell = screen.getByRole('button', { name: /Notifications/i });
    expect(bell).toBeInTheDocument();
    expect(bell).not.toHaveTextContent('3');
  });

  it('renders the theme toggle', () => {
    renderTopbar();
    expect(
      screen.getByRole('button', { name: /Switch to (light|dark) mode/i }),
    ).toBeInTheDocument();
  });
});
