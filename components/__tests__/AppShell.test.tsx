import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppShell } from '@/components/app/AppShell';
import { ThemeProvider } from '@/lib/theme';
import { ToastProvider } from '@/components/ui/Toast';

// The shell reads the current route and navigates via the app router; both are
// Next runtime services, so they're mocked here (jsdom has no app router).
const push = vi.fn();
const prefetch = vi.fn();
let pathname = '/inbox';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, prefetch }),
  usePathname: () => pathname,
}));

function renderShell(children: React.ReactNode = <p>page content</p>) {
  return render(
    <ThemeProvider>
      <ToastProvider>
        <AppShell counts={{ today: 3, waiting: 2, drafts: 1 }}>{children}</AppShell>
      </ToastProvider>
    </ThemeProvider>,
  );
}

describe('AppShell', () => {
  beforeEach(() => {
    push.mockClear();
    pathname = '/inbox';
  });

  it('renders the sidebar, the page title for the current route, and the content', () => {
    renderShell();
    // Topbar shows the route's title instead of the dashboard greeting.
    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeInTheDocument();
    expect(screen.queryByText(/Good morning/i)).not.toBeInTheDocument();
    expect(screen.getByText('page content')).toBeInTheDocument();
    // The full nav is present with its real badges.
    expect(screen.getByRole('link', { name: /Draft Replies/ })).toHaveAttribute('href', '/drafts');
    expect(screen.getByRole('link', { name: /Weekly Review/ })).toHaveAttribute(
      'href',
      '/weekly-review',
    );
  });

  it('routes the Today and Memory & Rules buttons back to the dashboard', async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole('button', { name: /^Today/ }));
    expect(push).toHaveBeenCalledWith('/');

    await user.click(screen.getByRole('button', { name: /^Memory & Rules$/ }));
    expect(push).toHaveBeenCalledWith('/?view=memory');
  });

  it('keeps Delegation as an honest Soon row (no dead click)', () => {
    renderShell();
    expect(screen.getByText('Delegation')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delegation/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Delegation/ })).not.toBeInTheDocument();
  });
});
