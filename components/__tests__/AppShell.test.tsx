import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
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
    // The full nav is present with its real badges. Ask Vesta / Briefing now
    // exist TWICE (sidebar + the phone tab bar) — every instance must point
    // at the right route.
    expect(screen.getByRole('link', { name: /Draft Replies/ })).toHaveAttribute('href', '/drafts');
    for (const el of screen.getAllByRole('link', { name: /Ask Vesta/ })) {
      expect(el).toHaveAttribute('href', '/chat');
    }
    for (const el of screen.getAllByRole('link', { name: /Briefing/ })) {
      expect(el).toHaveAttribute('href', '/briefing');
    }
    expect(screen.getByRole('link', { name: /Weekly Review/ })).toHaveAttribute(
      'href',
      '/weekly-review',
    );
  });

  it('renders the phone tab bar with the five app stations', () => {
    renderShell();
    const bar = screen.getByRole('navigation', { name: 'Primary' });
    expect(within(bar).getByRole('link', { name: /Today/ })).toHaveAttribute('href', '/');
    expect(within(bar).getByRole('link', { name: /Inbox/ })).toHaveAttribute('href', '/inbox');
    expect(within(bar).getByRole('link', { name: /Ask Vesta/ })).toHaveAttribute('href', '/chat');
    expect(within(bar).getByRole('link', { name: /Briefing/ })).toHaveAttribute(
      'href',
      '/briefing',
    );
    expect(within(bar).getByRole('button', { name: 'Open menu' })).toBeInTheDocument();
  });

  it('shows the Ask Vesta page header on /chat', () => {
    pathname = '/chat';
    renderShell();
    expect(screen.getByRole('heading', { name: 'Ask Vesta' })).toBeInTheDocument();
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
