import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BriefingView } from '@/components/briefing/BriefingView';
import type { BriefingData, BriefingItemView } from '@/lib/briefing/data';
import { ToastProvider } from '@/components/ui/Toast';

// Server actions are stubbed (their logic lives in lib/briefing + lib/ai tests).
const generateBriefing = vi.fn(async () => ({ ok: true as const, generated: 0 }));
const setBriefingItemStatus = vi.fn(async () => ({ ok: true as const }));
vi.mock('@/app/actions/briefing', () => ({
  generateBriefing: (...args: unknown[]) => generateBriefing(...(args as [])),
  setBriefingItemStatus: (...args: unknown[]) => setBriefingItemStatus(...(args as [])),
  saveBriefingPreferences: vi.fn(async () => ({ ok: true })),
}));

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/briefing',
}));

const ITEM: BriefingItemView = {
  id: 'b1',
  rank: 0,
  title: 'New AI data regulation announced in the UAE',
  summary: 'New rules cover AI data storage.',
  whyItMatters: 'May affect how the company stores customer data.',
  suggestedAction: 'Share with Legal and IT for review.',
  category: 'regulation_risk',
  relevanceScore: 88,
  sourceName: 'Gulf Times',
  sourceUrl: 'https://news.example/1',
  publishedAt: '2026-06-11T06:00:00.000Z',
  status: 'unread',
  imageUrl: 'https://img.example/story.jpg',
  sourceDomain: 'gulftimes.example',
};

function makeData(over: Partial<BriefingData> = {}): BriefingData {
  return {
    prefs: {
      enabled: true,
      sourceEngine: 'google_rss',
      itemsPerDay: 8,
      languages: ['en'],
      region: null,
      topics: ['AI and technology'],
      companies: [],
      blockedSources: [],
      tone: 'executive',
    },
    configured: true,
    items: [ITEM],
    saved: [],
    briefDate: '2026-06-11',
    timezone: 'UTC',
    ...over,
  };
}

function renderView(data: BriefingData) {
  return render(
    <ToastProvider>
      <BriefingView data={data} />
    </ToastProvider>,
  );
}

describe('BriefingView', () => {
  beforeEach(() => {
    generateBriefing.mockClear();
    setBriefingItemStatus.mockClear();
  });

  it('renders an item card with why-it-matters, action, source link, and controls', () => {
    renderView(makeData());
    expect(screen.getByText('New AI data regulation announced in the UAE')).toBeInTheDocument();
    expect(screen.getByText(/May affect how the company stores customer data/)).toBeInTheDocument();
    expect(screen.getByText(/Share with Legal and IT/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Read source/ })).toHaveAttribute(
      'href',
      'https://news.example/1',
    );
    expect(screen.getByText('Regulation & risk')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Dismiss/ })).toBeInTheDocument();
  });

  it('first run shows the preferences setup instead of an empty page', () => {
    renderView(makeData({ configured: false, items: [] }));
    expect(screen.getByText('What should Vesta watch for you?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save & build my briefing/ })).toBeInTheDocument();
    // No generation fired before topics exist.
    expect(generateBriefing).not.toHaveBeenCalled();
  });

  it('auto-builds today when configured but empty', () => {
    renderView(makeData({ items: [] }));
    expect(generateBriefing).toHaveBeenCalledWith(false);
  });

  it('does not auto-build when today already has items', () => {
    renderView(makeData());
    expect(generateBriefing).not.toHaveBeenCalled();
  });

  it('dismissing an item removes it optimistically', async () => {
    const user = userEvent.setup();
    renderView(makeData());
    await user.click(screen.getByRole('button', { name: /Dismiss/ }));
    expect(screen.queryByText('New AI data regulation announced in the UAE')).not.toBeInTheDocument();
    expect(setBriefingItemStatus).toHaveBeenCalledWith('b1', 'dismissed');
  });

  it('Refresh forces a regeneration', async () => {
    const user = userEvent.setup();
    renderView(makeData());
    await user.click(screen.getByRole('button', { name: /Refresh/ }));
    expect(generateBriefing).toHaveBeenCalledWith(true);
  });

  it('labels the relevance score as a match percentage with an explainer tooltip', () => {
    renderView(makeData());
    const chip = screen.getByText('88% match');
    expect(chip).toHaveAttribute('title', expect.stringMatching(/relevant.*to you/i));
  });

  it('renders the article image when present and category art when absent', () => {
    const second: BriefingItemView = { ...ITEM, id: 'b2', rank: 1, imageUrl: null };
    const { container } = renderView(makeData({ items: [ITEM, second] }));
    const imgs = Array.from(container.querySelectorAll('img')).map((i) => i.getAttribute('src'));
    expect(imgs).toContain('https://img.example/story.jpg');
    // The no-image card falls back to a gradient panel (inline backgroundImage).
    const art = container.querySelector('[style*="linear-gradient"]');
    expect(art).not.toBeNull();
  });

  it('shows the publisher favicon chip from the source domain', () => {
    const { container } = renderView(makeData());
    const fav = Array.from(container.querySelectorAll('img')).find((i) =>
      (i.getAttribute('src') ?? '').includes('s2/favicons'),
    );
    expect(fav?.getAttribute('src')).toContain('gulftimes.example');
  });

  it('explains the Saved-for-later shelf', () => {
    const savedItem: BriefingItemView = { ...ITEM, id: 'b9', status: 'saved' };
    renderView(makeData({ saved: [savedItem] }));
    expect(screen.getByText('Saved for later')).toBeInTheDocument();
    expect(screen.getByText(/stay on this shelf across days/i)).toBeInTheDocument();
  });
});
