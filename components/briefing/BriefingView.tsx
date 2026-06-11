'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateBriefing, setBriefingItemStatus } from '@/app/actions/briefing';
import type { BriefingData, BriefingItemView } from '@/lib/briefing/data';
import { faviconUrl } from '@/lib/briefing/images';
import { PreferencesPanel } from './PreferencesPanel';
import { Icon, type IconName } from '@/components/ui/Icon';
import { LocalTime } from '@/components/ui/LocalTime';
import { useToast } from '@/components/ui/Toast';

/**
 * The Briefing page body: today's personalized items (built once per day,
 * Refresh forces a re-run), save/dismiss controls, a Saved-for-later shelf,
 * and the preferences panel (shown inline on first run).
 *
 * Visuals: the top story renders as a full-width hero; every card carries the
 * article's og:image when generation resolved one, or a deterministic
 * category-gradient panel when it didn't (self-contained artwork — reads the
 * same in light and dark). Source favicons come from Google's s2 service.
 */

const CATEGORY_LABEL: Record<string, string> = {
  must_know: 'Must know',
  industry: 'Industry',
  technology: 'Technology',
  client_competitor: 'Clients & competitors',
  regulation_risk: 'Regulation & risk',
  market: 'Markets',
  other: 'Update',
};

const CATEGORY_CHIP: Record<string, string> = {
  must_know: 'bg-red-soft text-red',
  regulation_risk: 'bg-amber-soft text-amber',
  client_competitor: 'bg-accent-soft text-accent',
  technology: 'bg-accent-soft text-accent',
  industry: 'bg-panel-2 text-muted',
  market: 'bg-green-soft text-green',
  other: 'bg-panel-2 text-muted',
};

/** Fallback artwork per category — fixed gradients (image-like content that
 *  is identical in both themes) + a large translucent icon. */
const CATEGORY_ART: Record<string, { bg: string; icon: IconName }> = {
  must_know: { bg: 'linear-gradient(135deg,#b91c1c,#f97316)', icon: 'sparkle' },
  regulation_risk: { bg: 'linear-gradient(135deg,#92400e,#f59e0b)', icon: 'shield' },
  client_competitor: { bg: 'linear-gradient(135deg,#5b21b6,#8b5cf6)', icon: 'people' },
  technology: { bg: 'linear-gradient(135deg,#1d4ed8,#06b6d4)', icon: 'sparkle' },
  industry: { bg: 'linear-gradient(135deg,#334155,#64748b)', icon: 'trend' },
  market: { bg: 'linear-gradient(135deg,#065f46,#10b981)', icon: 'trend' },
  other: { bg: 'linear-gradient(135deg,#1e3a5f,#3b82f6)', icon: 'sun' },
};

function CategoryArt({ category, className }: { category: string | null; className: string }) {
  const art = CATEGORY_ART[category ?? 'other'] ?? CATEGORY_ART.other;
  return (
    <div
      aria-hidden="true"
      className={`grid place-items-center ${className}`}
      style={{ backgroundImage: art.bg }}
    >
      <Icon name={art.icon} className="h-10 w-10 text-white/40" />
    </div>
  );
}

/** Article image with graceful fallback to the category art on load failure. */
function CardVisual({ item, className }: { item: BriefingItemView; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!item.imageUrl || failed) return <CategoryArt category={item.category} className={className} />;
  return (
    // News images come from arbitrary publisher domains; next/image needs a fixed allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.imageUrl}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

/** Source favicon + name; the favicon hides itself if it fails to load. */
function SourceChip({ item }: { item: BriefingItemView }) {
  const [failed, setFailed] = useState(false);
  const fav = faviconUrl(item.sourceDomain);
  if (!item.sourceName && !fav) return null;
  return (
    <span className="inline-flex items-center gap-[6px] text-[11px] font-medium text-muted">
      {fav && !failed && (
        // Favicons come from Google's s2 service for arbitrary publisher domains.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fav}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-[14px] w-[14px] rounded-[3px]"
        />
      )}
      {item.sourceName}
    </span>
  );
}

/** The "92% match" chip — Vesta's relevance score for THIS manager. */
function MatchChip({ score }: { score: number | null }) {
  if (score == null) return null;
  return (
    <span
      title="How relevant Vesta thinks this story is to you (your role, topics, and tracked companies) — 100 means unmissable."
      className="cursor-help rounded-full bg-panel-2 px-[8px] py-[2px] font-mono text-[10.5px] font-semibold text-muted"
    >
      {score}% match
    </span>
  );
}

function CardActions({
  item,
  onStatus,
  busy,
}: {
  item: BriefingItemView;
  onStatus: (id: string, status: 'saved' | 'dismissed' | 'unread') => void;
  busy: boolean;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {item.sourceUrl && (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-[5px] rounded-[9px] border border-line bg-panel-2 px-[10px] py-[6px] text-[12px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
        >
          Read source
          <Icon name="arrow" className="h-[11px] w-[11px]" />
        </a>
      )}
      {item.status === 'saved' ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onStatus(item.id, 'unread')}
          title="Remove from your Saved-for-later shelf"
          className="inline-flex items-center gap-[5px] rounded-[9px] bg-accent-soft px-[10px] py-[6px] text-[12px] font-semibold text-accent transition hover:brightness-110 disabled:opacity-60"
        >
          <Icon name="check" className="h-[11px] w-[11px]" />
          Saved
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => onStatus(item.id, 'saved')}
          title="Keep this story on your Saved-for-later shelf (bottom of this page)"
          className="inline-flex items-center gap-[5px] rounded-[9px] border border-line bg-panel-2 px-[10px] py-[6px] text-[12px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent disabled:opacity-60"
        >
          Save
        </button>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => onStatus(item.id, 'dismissed')}
        className="ml-auto inline-flex items-center gap-[5px] rounded-[9px] px-[10px] py-[6px] text-[12px] font-semibold text-muted transition hover:text-ink disabled:opacity-60"
      >
        <Icon name="close" className="h-[11px] w-[11px]" />
        Dismiss
      </button>
    </div>
  );
}

function CardMeta({ item }: { item: BriefingItemView }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`rounded-full px-[8px] py-[2px] text-[10.5px] font-semibold ${CATEGORY_CHIP[item.category ?? 'other'] ?? CATEGORY_CHIP.other}`}
      >
        {CATEGORY_LABEL[item.category ?? 'other'] ?? 'Update'}
      </span>
      <MatchChip score={item.relevanceScore} />
      <span className="ml-auto flex items-center gap-2 text-[11px] text-muted">
        <SourceChip item={item} />
        {item.publishedAt && (
          <span className="font-mono">
            <LocalTime iso={item.publishedAt} />
          </span>
        )}
      </span>
    </div>
  );
}

function CardBody({ item, hero }: { item: BriefingItemView; hero?: boolean }) {
  return (
    <>
      <h3
        className={`m-0 mt-2 font-semibold leading-snug tracking-tight text-ink ${
          hero ? 'font-display text-[19px]' : 'text-[15px]'
        }`}
      >
        {item.title}
      </h3>
      {item.summary && (
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{item.summary}</p>
      )}
      {item.whyItMatters && (
        <p className="mt-2 flex items-start gap-[7px] text-[12.5px] leading-snug text-ink">
          <Icon name="sparkle" className="mt-[2px] h-[13px] w-[13px] flex-none text-accent" />
          <span>
            <b className="text-accent">Why it matters:</b> {item.whyItMatters}
          </span>
        </p>
      )}
      {item.suggestedAction && (
        <p className="mt-1 flex items-start gap-[7px] text-[12.5px] leading-snug text-muted">
          <Icon name="arrow" className="mt-[2px] h-[13px] w-[13px] flex-none" />
          <span>{item.suggestedAction}</span>
        </p>
      )}
    </>
  );
}

function ItemCard({
  item,
  hero = false,
  onStatus,
  busy,
}: {
  item: BriefingItemView;
  /** Top story: full-width, side-by-side image layout on desktop. */
  hero?: boolean;
  onStatus: (id: string, status: 'saved' | 'dismissed' | 'unread') => void;
  busy: boolean;
}) {
  if (hero) {
    return (
      <article className="overflow-hidden rounded-[14px] border border-line bg-panel shadow-soft transition hover:border-line-strong xl:col-span-2">
        <div className="flex flex-col md:flex-row">
          <CardVisual item={item} className="h-44 w-full flex-none md:h-auto md:min-h-[230px] md:w-[42%]" />
          <div className="flex min-w-0 flex-1 flex-col p-4">
            <CardMeta item={item} />
            <CardBody item={item} hero />
            <div className="mt-auto">
              <CardActions item={item} onStatus={onStatus} busy={busy} />
            </div>
          </div>
        </div>
      </article>
    );
  }
  return (
    <article className="flex flex-col overflow-hidden rounded-[14px] border border-line bg-panel shadow-soft transition hover:border-line-strong">
      <CardVisual item={item} className="h-36 w-full flex-none" />
      <div className="flex flex-1 flex-col p-4">
        <CardMeta item={item} />
        <CardBody item={item} />
        <div className="mt-auto">
          <CardActions item={item} onStatus={onStatus} busy={busy} />
        </div>
      </div>
    </article>
  );
}

export function BriefingView({ data }: { data: BriefingData }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [items, setItems] = useState<BriefingItemView[]>(data.items);
  const [saved, setSaved] = useState<BriefingItemView[]>(data.saved);
  useEffect(() => {
    setItems(data.items);
    setSaved(data.saved);
  }, [data.items, data.saved]);

  const [prefsOpen, setPrefsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);

  const firstRun = !data.configured;
  const hasTopics = data.prefs.topics.length > 0 || data.prefs.companies.length > 0;

  /** Build today's briefing (no-op when it exists; force on Refresh). */
  function runGenerate(force: boolean) {
    setGenerating(true);
    void generateBriefing(force)
      .then((res) => {
        if (res.ok) {
          if (res.generated > 0) showToast(`Briefing ready — ${res.generated} items.`);
          router.refresh();
        } else {
          showToast(res.reason);
        }
      })
      .finally(() => setGenerating(false));
  }

  // First visit of the day: build automatically (cached after that).
  useEffect(() => {
    if (data.configured && hasTopics && data.prefs.enabled && data.items.length === 0) {
      runGenerate(false);
    }
    // Once per page load, mirroring the daily-brief pattern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStatus(id: string, status: 'saved' | 'dismissed' | 'unread') {
    setBusy(true);
    // Optimistic: dismissed leaves the list; saved/unread toggles in place.
    const prevItems = items;
    const prevSaved = saved;
    if (status === 'dismissed') {
      setItems((list) => list.filter((i) => i.id !== id));
      setSaved((list) => list.filter((i) => i.id !== id));
    } else {
      const update = (list: BriefingItemView[]) =>
        list.map((i) => (i.id === id ? { ...i, status } : i));
      setItems(update);
      setSaved((list) =>
        status === 'unread' ? list.filter((i) => i.id !== id) : update(list),
      );
    }
    void setBriefingItemStatus(id, status).then((res) => {
      setBusy(false);
      if (!res.ok) {
        setItems(prevItems);
        setSaved(prevSaved);
        showToast(res.error ?? 'Could not update the item.');
      }
    });
  }

  // First run: the preferences ARE the page.
  if (firstRun || (prefsOpen && !hasTopics)) {
    return (
      <div className="flex flex-col gap-4">
        <PreferencesPanel
          prefs={data.prefs}
          firstRun
          onSaved={() => runGenerate(true)}
        />
        <p className="flex items-start gap-2 text-[12px] leading-snug text-muted">
          <Icon name="shield" className="mt-px h-[14px] w-[14px] flex-none text-accent" />
          Work always comes first: your briefing lives here, never above Today&rsquo;s Radar.
          Every item shows its source.
        </p>
      </div>
    );
  }

  const [top, ...rest] = items;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <p className="m-0 mr-auto text-[13px] text-muted">
          {generating
            ? 'Vesta is reading the news for you…'
            : items.length > 0
              ? `${items.length} update${items.length === 1 ? '' : 's'} picked for you today.`
              : 'No briefing yet today.'}
        </p>
        <button
          type="button"
          disabled={generating}
          onClick={() => runGenerate(true)}
          className="inline-flex items-center gap-[6px] rounded-[11px] border border-line bg-panel px-3 py-[8px] text-[12.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent disabled:opacity-60"
        >
          <Icon name="refresh" className={`h-[13px] w-[13px] ${generating ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setPrefsOpen((o) => !o)}
          className="inline-flex items-center gap-[6px] rounded-[11px] border border-line bg-panel px-3 py-[8px] text-[12.5px] font-semibold text-ink-soft transition hover:border-accent hover:text-accent"
        >
          <Icon name="settings" className="h-[13px] w-[13px]" />
          Preferences
        </button>
      </div>

      {prefsOpen && (
        <PreferencesPanel
          prefs={data.prefs}
          onSaved={() => {
            setPrefsOpen(false);
            runGenerate(true);
          }}
          onClose={() => setPrefsOpen(false)}
        />
      )}

      {/* Today's items — top story as a hero, the rest in a two-column grid. */}
      {items.length === 0 && !generating ? (
        <div className="rounded-[var(--radius)] border border-dashed border-line-strong bg-panel-2 p-10 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent-soft text-accent">
            <Icon name="sun" className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-[18px] font-semibold tracking-tight">
            Nothing briefed yet today
          </h2>
          <p className="mx-auto mt-1 max-w-[440px] text-[13px] leading-relaxed text-muted">
            Hit <b>Refresh</b> to build today&rsquo;s briefing from your topics, or widen your
            topics in <b>Preferences</b> if results keep coming back empty.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {top && <ItemCard item={top} hero onStatus={handleStatus} busy={busy} />}
          {rest.map((item) => (
            <ItemCard key={item.id} item={item} onStatus={handleStatus} busy={busy} />
          ))}
        </div>
      )}

      {/* Saved for later — stories kept with the Save button (today's and
          earlier days'); they stay until dismissed or un-saved. */}
      {saved.length > 0 && (
        <section className="mt-2">
          <h2 className="m-0 text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">
            Saved for later
          </h2>
          <p className="m-0 mb-2 mt-1 text-[12px] text-muted">
            Stories you saved — they stay on this shelf across days until you dismiss them.
          </p>
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {saved.map((item) => (
              <ItemCard key={item.id} item={item} onStatus={handleStatus} busy={busy} />
            ))}
          </div>
        </section>
      )}

      <p className="flex items-start gap-2 text-[12px] leading-snug text-muted">
        <Icon name="shield" className="mt-px h-[14px] w-[14px] flex-none text-accent" />
        Built only from your chosen topics — nothing from your mailbox is ever sent to news
        services. Every item links to its source.
      </p>
    </div>
  );
}
