'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { saveBriefingPreferences } from '@/app/actions/briefing';
import type { BriefingPrefs } from '@/lib/briefing/data';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

/** Starter topics — one tap each; custom topics cover everything else. */
const SUGGESTED_TOPICS = [
  'AI and technology',
  'Cybersecurity',
  'Business and markets',
  'Regulations and compliance',
  'Finance and economy',
  'Hiring and HR',
];

const REGIONS: { code: string; label: string }[] = [
  { code: '', label: 'Worldwide' },
  { code: 'AE', label: 'UAE' },
  { code: 'LB', label: 'Lebanon' },
  { code: 'SA', label: 'Saudi Arabia' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'EU', label: 'Europe' },
];

function ChipsEditor({
  label,
  hint,
  values,
  onChange,
  placeholder,
  suggestions = [],
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState('');
  const add = (v: string) => {
    const t = v.trim();
    if (!t || values.some((x) => x.toLowerCase() === t.toLowerCase())) return;
    onChange([...values, t]);
  };
  return (
    <div>
      <p className="m-0 text-[12.5px] font-semibold text-ink">{label}</p>
      {hint && <p className="m-0 mt-[2px] text-[11.5px] text-muted">{hint}</p>}
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-[6px]">
          {suggestions
            .filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()))
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="rounded-full border border-dashed border-line-strong px-[10px] py-[4px] text-[11.5px] font-medium text-muted transition hover:border-accent hover:text-accent"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-[6px]">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-[6px] rounded-full bg-accent-soft px-[10px] py-[4px] text-[11.5px] font-semibold text-accent"
            >
              {v}
              <button
                type="button"
                aria-label={`Remove ${v}`}
                onClick={() => onChange(values.filter((x) => x !== v))}
                className="grid h-[14px] w-[14px] place-items-center rounded-full transition hover:bg-accent hover:text-white"
              >
                <Icon name="close" className="h-[9px] w-[9px]" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
              setDraft('');
            }
          }}
          placeholder={placeholder}
          aria-label={`Add ${label.toLowerCase()}`}
          className="min-w-0 flex-1 rounded-[10px] border border-line bg-panel px-3 py-[8px] text-[13px] text-ink outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="button"
          onClick={() => {
            add(draft);
            setDraft('');
          }}
          className="rounded-[10px] border border-line-strong bg-panel-2 px-3 py-[8px] text-[12.5px] font-semibold text-ink transition hover:border-accent hover:text-accent"
        >
          Add
        </button>
      </div>
    </div>
  );
}

/**
 * Briefing preferences — topics, tracked companies, region, volume, and the
 * news engine (Google News feeds vs AI web-search). Saving triggers the
 * parent to regenerate today's briefing.
 */
export function PreferencesPanel({
  prefs,
  firstRun = false,
  onSaved,
  onClose,
}: {
  prefs: BriefingPrefs;
  /** First run: bigger welcome framing, no close button. */
  firstRun?: boolean;
  onSaved: () => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, startTransition] = useTransition();
  const [topics, setTopics] = useState<string[]>(prefs.topics);
  const [companies, setCompanies] = useState<string[]>(prefs.companies);
  const [region, setRegion] = useState(prefs.region ?? '');
  const [itemsPerDay, setItemsPerDay] = useState(prefs.itemsPerDay);
  const [engine, setEngine] = useState(prefs.sourceEngine);
  const [tone, setTone] = useState(prefs.tone);

  function save() {
    if (topics.length === 0 && companies.length === 0) {
      showToast('Pick at least one topic or company to follow.');
      return;
    }
    startTransition(async () => {
      const res = await saveBriefingPreferences({
        topics,
        companies,
        region: region || null,
        itemsPerDay,
        sourceEngine: engine,
        tone,
        enabled: true,
      });
      if (res.ok) {
        showToast('Briefing preferences saved.');
        router.refresh();
        onSaved();
      } else {
        showToast(res.error ?? 'Could not save preferences.');
      }
    });
  }

  return (
    <section className="rounded-[var(--radius)] border border-line bg-panel p-5 shadow-glow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="m-0 font-display text-[18px] font-semibold tracking-tight">
            {firstRun ? 'What should Vesta watch for you?' : 'Briefing preferences'}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            {firstRun
              ? 'Pick the topics and companies that matter to you — Vesta builds a short personal briefing from them every day. Only these keywords are used to search news; never anything from your mailbox.'
              : 'Only these keywords are used to search news — never anything from your mailbox.'}
          </p>
        </div>
        {!firstRun && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preferences"
            className="grid h-8 w-8 flex-none place-items-center rounded-[10px] border border-line bg-panel-2 text-ink-soft transition hover:border-accent hover:text-accent"
          >
            <Icon name="close" className="h-[14px] w-[14px]" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <ChipsEditor
          label="Topics"
          hint="Anything works — broad ('AI and technology') or precise ('UAE data privacy law')."
          values={topics}
          onChange={setTopics}
          placeholder='Add a topic, e.g. "Microsoft 365 Copilot updates"'
          suggestions={SUGGESTED_TOPICS}
        />
        <ChipsEditor
          label="Companies to track"
          hint="Your company, clients, competitors, vendors."
          values={companies}
          onChange={setCompanies}
          placeholder='Add a company, e.g. "Microsoft"'
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-semibold text-ink">Region focus</span>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="rounded-[10px] border border-line bg-panel px-3 py-[8px] text-[13px] text-ink outline-none focus:border-accent"
            >
              {REGIONS.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-semibold text-ink">Items per day</span>
            <select
              value={itemsPerDay}
              onChange={(e) => setItemsPerDay(Number(e.target.value))}
              className="rounded-[10px] border border-line bg-panel px-3 py-[8px] text-[13px] text-ink outline-none focus:border-accent"
            >
              {[5, 8, 10, 15].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12.5px] font-semibold text-ink">Style</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as 'executive' | 'detailed')}
              className="rounded-[10px] border border-line bg-panel px-3 py-[8px] text-[13px] text-ink outline-none focus:border-accent"
            >
              <option value="executive">Short executive summary</option>
              <option value="detailed">More detailed analysis</option>
            </select>
          </label>
        </div>

        <div>
          <p className="m-0 text-[12.5px] font-semibold text-ink">News engine</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <label className="flex flex-1 cursor-pointer items-start gap-[9px] rounded-[12px] border border-line bg-panel-2 p-3 transition hover:border-line-strong">
              <input
                type="radio"
                name="briefing-engine"
                checked={engine === 'google_rss'}
                onChange={() => setEngine('google_rss')}
                className="mt-[2px] accent-[var(--accent)]"
              />
              <span>
                <span className="block text-[13px] font-semibold text-ink">Google News</span>
                <span className="mt-[1px] block text-[11.5px] text-muted">
                  Free feeds per topic. Fast and reliable.
                </span>
              </span>
            </label>
            <label className="flex flex-1 cursor-pointer items-start gap-[9px] rounded-[12px] border border-line bg-panel-2 p-3 transition hover:border-line-strong">
              <input
                type="radio"
                name="briefing-engine"
                checked={engine === 'ai_search'}
                onChange={() => setEngine('ai_search')}
                className="mt-[2px] accent-[var(--accent)]"
              />
              <span>
                <span className="block text-[13px] font-semibold text-ink">AI web search</span>
                <span className="mt-[1px] block text-[11.5px] text-muted">
                  The AI searches the web itself. Costs more; falls back to Google News if
                  unavailable.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={save}
            className="inline-flex items-center gap-[7px] rounded-[11px] bg-gradient-to-br from-accent to-accent-2 px-4 py-[10px] text-[13px] font-semibold text-white shadow-soft transition hover:brightness-110 disabled:opacity-60"
          >
            <Icon name="check" className="h-[14px] w-[14px]" />
            {pending ? 'Saving…' : firstRun ? 'Save & build my briefing' : 'Save preferences'}
          </button>
          {!firstRun && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-[11px] border border-line-strong bg-panel-2 px-4 py-[10px] text-[13px] font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
