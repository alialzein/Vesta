'use client';

import { useState } from 'react';
import { ActionButton } from '@/components/admin/ActionButton';
import { Badge } from '@/components/admin/ui';
import { adminSaveAppSettings } from '@/app/(admin)/admin/actions';
import type { AppSettings } from '@/lib/admin/settings';

function numOrNull(v: string): number | null {
  const n = Number(v);
  return v.trim() === '' || !Number.isFinite(n) ? null : n;
}
const s = (v: string | number | null) => (v === null ? '' : String(v));

export function AiSettings({
  settings,
  envProvider,
  envModel,
  keyConfigured,
}: {
  settings: AppSettings;
  envProvider: string;
  envModel: string;
  keyConfigured: boolean;
}) {
  const [provider, setProvider] = useState(settings.ai_provider ?? '');
  const [model, setModel] = useState(settings.ai_model ?? '');
  const [analysisModel, setAnalysisModel] = useState(settings.ai_model_analysis ?? '');
  const [draftModel, setDraftModel] = useState(settings.ai_model_draft ?? '');
  const [maxRun, setMaxRun] = useState(s(settings.ai_max_per_run));
  const [maxDay, setMaxDay] = useState(s(settings.ai_max_per_day));
  const [priceIn, setPriceIn] = useState(s(settings.ai_price_input));
  const [priceOut, setPriceOut] = useState(s(settings.ai_price_output));
  const [costCap, setCostCap] = useState(s(settings.ai_daily_cost_cap_usd));
  const [replyMode, setReplyMode] = useState(settings.reply_intent_mode ?? '');
  const [sendMode, setSendMode] = useState(settings.draft_send_mode ?? '');

  return (
    <div className="rounded-[14px] border border-line bg-panel p-5 shadow-soft">
      {/* Live runtime status (from env / Vercel — keys never editable here). */}
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-[10px] border border-line bg-panel-2 px-3 py-2 text-[12px]">
        <span className="text-muted">Live runtime:</span>
        <Badge tone="accent">{envProvider || 'unset'}</Badge>
        <span className="font-mono text-ink">{envModel || '—'}</span>
        <span className="ml-auto">
          API key:{' '}
          {keyConfigured ? <Badge tone="good">configured</Badge> : <Badge tone="bad">missing</Badge>}
        </span>
      </div>
      <p className="mb-4 text-[11.5px] text-muted">
        Provider/model/budgets below override env when set (blank = use env). The secret API key
        lives only in env/Vercel and is never stored or shown here.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Select label="Provider override" value={provider} onChange={setProvider} options={['', 'openai', 'anthropic']} />
        <Field label="Default model" value={model} onChange={setModel} placeholder={envModel} />
        <Field label="Analysis model" value={analysisModel} onChange={setAnalysisModel} hint="overrides default for analysis" />
        <Field label="Draft model" value={draftModel} onChange={setDraftModel} hint="overrides default for drafts" />
        <Field label="Max analyses / run" value={maxRun} onChange={setMaxRun} placeholder="20" />
        <Field label="Max analyses / day" value={maxDay} onChange={setMaxDay} placeholder="200" />
        <Field label="Price in ($/1M)" value={priceIn} onChange={setPriceIn} hint="for cost estimates" />
        <Field label="Price out ($/1M)" value={priceOut} onChange={setPriceOut} />
        <Field label="Daily cost cap ($)" value={costCap} onChange={setCostCap} hint="global; blank = none" />
        <Select
          label="Reply-intent mode"
          value={replyMode}
          onChange={setReplyMode}
          options={['', 'pregate_ai', 'ai_always', 'heuristic', 'off']}
        />
        <Select label="Draft send mode" value={sendMode} onChange={setSendMode} options={['', 'graph', 'draft_only']} />
      </div>

      <div className="mt-4">
        <ActionButton
          run={() =>
            adminSaveAppSettings({
              ai_provider: provider || null,
              ai_model: model || null,
              ai_model_analysis: analysisModel || null,
              ai_model_draft: draftModel || null,
              ai_max_per_run: numOrNull(maxRun),
              ai_max_per_day: numOrNull(maxDay),
              ai_price_input: numOrNull(priceIn),
              ai_price_output: numOrNull(priceOut),
              ai_daily_cost_cap_usd: numOrNull(costCap),
              reply_intent_mode: replyMode || null,
              draft_send_mode: sendMode || null,
            })
          }
        >
          Save AI settings
        </ActionButton>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-line bg-field px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
      />
      {hint && <span className="text-[11.5px] text-muted">{hint}</span>}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[12.5px] font-semibold text-ink">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-line bg-field px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o === '' ? '(use env / default)' : o}
          </option>
        ))}
      </select>
    </label>
  );
}
