import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { ThemeProvider } from '@/lib/theme';

/**
 * The landing page itself is DOM + copy; the WebGL scene and GSAP scrolling are
 * browser-only, so they're mocked here (jsdom has no WebGL/ScrollTrigger).
 * The mock mirrors the real onReady contract (next/dynamic drops refs, so the
 * scene hands its scroll handle up via callback).
 */
const sceneHandle = { setProgress: vi.fn() };
vi.mock('@/components/landing/VestaScene', () => ({
  VestaScene: function MockScene({
    className,
    onReady,
  }: {
    className?: string;
    onReady?: (handle: { setProgress: (p: number) => void }) => void;
  }) {
    useEffect(() => {
      onReady?.(sceneHandle);
    }, [onReady]);
    return <div data-testid="vesta-scene" className={className} />;
  },
}));

vi.mock('gsap', () => {
  const timeline = {
    to: vi.fn(function (this: unknown) {
      return this;
    }),
    fromTo: vi.fn(function (this: unknown) {
      return this;
    }),
    set: vi.fn(function (this: unknown) {
      return this;
    }),
    kill: vi.fn(),
    scrollTrigger: null,
  };
  return {
    gsap: {
      registerPlugin: vi.fn(),
      utils: { toArray: () => [] },
      fromTo: vi.fn(() => ({ scrollTrigger: null, kill: vi.fn() })),
      to: vi.fn(() => ({ scrollTrigger: null, kill: vi.fn() })),
      set: vi.fn(),
      timeline: vi.fn(() => timeline),
      // FeatureSpotlights builds its mock timelines inside a gsap.context.
      context: vi.fn((fn?: () => void) => {
        fn?.();
        return { revert: vi.fn() };
      }),
    },
  };
});

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { create: vi.fn(() => ({ kill: vi.fn() })) },
}));

// jsdom has no matchMedia; the page reads prefers-reduced-motion through it.
window.matchMedia =
  window.matchMedia ||
  ((query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }) as unknown as MediaQueryList);

import { LandingPage } from '@/components/landing/LandingPage';

function renderLanding() {
  return render(
    <ThemeProvider>
      <LandingPage />
    </ThemeProvider>,
  );
}

describe('LandingPage', () => {
  it('renders the hero, tagline, and primary CTAs into /login', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: 'Your work, in order.' })).toBeInTheDocument();
    const cta = screen.getAllByRole('link', { name: /Get started/i });
    expect(cta.length).toBeGreaterThan(0);
    for (const link of cta) expect(link).toHaveAttribute('href', '/login');
    const signIns = screen.getAllByRole('link', { name: 'Sign in' }); // nav + footer
    expect(signIns.length).toBeGreaterThan(0);
    for (const link of signIns) expect(link).toHaveAttribute('href', '/login');
  });

  it('tells the six-step story of an email through Vesta', () => {
    renderLanding();
    for (const title of [
      'One connection',
      'Noise never reaches you',
      'AI that shows its work',
      'A radar, not an inbox',
      'Reply with one approval',
      'It keeps working',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('shows the three feature spotlight bands', () => {
    renderLanding();
    expect(
      screen.getByRole('heading', { name: /Start where it matters/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'AI that shows its work.' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Approve, don.t compose\./ })).toBeInTheDocument();
  });

  it('shows the toolkit grid and the approval-first safety strip', () => {
    renderLanding();
    // Memory & Rules shipped (Phase 10) — it lives in the toolkit grid now.
    expect(screen.getByText('Memory & Rules')).toBeInTheDocument();
    expect(screen.getByText('“Waiting on them” tracking')).toBeInTheDocument();
    // Shipped in Phase 11 — promoted from the roadmap into the toolkit grid.
    expect(screen.getByText('Daily Brief & Focus Mode')).toBeInTheDocument();
    expect(screen.getByText('Senders with faces')).toBeInTheDocument();
    // Weekly Review shipped with the sidebar button pass — it's in the grid now.
    expect(screen.getByText('Weekly Review')).toBeInTheDocument();
    // Personal Briefing shipped (PIB v1) — daily news intelligence by interests.
    expect(screen.getByText('Personal Briefing')).toBeInTheDocument();
    expect(screen.getByText(/Nothing is ever sent without your explicit approval/)).toBeInTheDocument();
  });

  it('shows the honest roadmap strip with Soon badges (shipped features are not in it)', () => {
    renderLanding();
    expect(screen.getByRole('heading', { name: 'Where Vesta goes next.' })).toBeInTheDocument();
    expect(screen.getByText('AI Decision Desk')).toBeInTheDocument();
    expect(screen.getByText('Microsoft Teams')).toBeInTheDocument();
    // Daily Brief & Focus Mode shipped (Phase 11) — only 2 Soon cards remain.
    expect(screen.getAllByText('Soon')).toHaveLength(2);
  });

  it('has a working theme toggle button', () => {
    renderLanding();
    expect(
      screen.getByRole('button', { name: /Switch to (light|dark) mode/i }),
    ).toBeInTheDocument();
  });

  it('receives the scene handle and syncs scroll progress to it', () => {
    sceneHandle.setProgress.mockClear();
    renderLanding();
    // onReady fires on mount; the page must replay the current progress so a
    // late-loading scene starts at the right camera position.
    expect(sceneHandle.setProgress).toHaveBeenCalledWith(0);
  });

  it('ends with the giant VESTA wordmark finale', () => {
    renderLanding();
    const wordmark = screen.getByRole('img', { name: 'Vesta' });
    expect(wordmark).toBeInTheDocument();
    // One stroke layer + one fill layer per letter.
    expect(wordmark.querySelectorAll('[data-stroke]')).toHaveLength(5);
    expect(wordmark.querySelectorAll('[data-fill]')).toHaveLength(5);
  });
});
