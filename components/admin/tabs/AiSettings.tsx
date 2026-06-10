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
        <Select
          label="Provider override"
          value={provider}
          onChange={setProvider}
          options={['', 'openai', 'anthropic']}
          tip="Which AI company to use. Leave on default unless you've also switched AI_API_KEY in env to that provider's key — the key must match the provider."
        />
        <Field
          label="Default model"
          value={model}
          onChange={setModel}
          placeholder={envModel}
          tip="The model name used for all AI work unless a per-task model below is set. Blank = the env model. Example: gpt-5.4-mini."
        />
        <Field
          label="Analysis model"
          value={analysisModel}
          onChange={setAnalysisModel}
          tip="Optional: a (cheaper) model used only for reading/classifying emails. Blank = use the default model."
        />
        <Field
          label="Draft model"
          value={draftModel}
          onChange={setDraftModel}
          tip="Optional: a (stronger) model used only for writing reply drafts. Blank = use the default model."
        />
        <Field
          label="Max analyses / run"
          value={maxRun}
          onChange={setMaxRun}
          placeholder="20"
          tip="How many emails the AI may analyze per sync run. Caps a sudden flood of mail. Blank = 20."
        />
        <Field
          label="Max analyses / day"
          value={maxDay}
          onChange={setMaxDay}
          placeholder="200"
          tip="How many AI analyses one user can consume per day. Blank = 200."
        />
        <Field
          label="Price in ($/1M)"
          value={priceIn}
          onChange={setPriceIn}
          tip="What your provider charges per 1 MILLION input tokens, in USD (from their pricing page). Used to turn token counts into dollar estimates."
        />
        <Field
          label="Price out ($/1M)"
          value={priceOut}
          onChange={setPriceOut}
          tip="What your provider charges per 1 MILLION output tokens, in USD. Output is usually several times the input price."
        />
        <Field
          label="Daily cost cap ($)"
          value={costCap}
          onChange={setCostCap}
          tip="Global safety brake: once today's estimated spend reaches this, AI pauses until tomorrow (heuristics still work). Blank = no cap."
        />
        <Select
          label="Reply-intent mode"
          value={replyMode}
          onChange={setReplyMode}
          options={['', 'pregate_ai', 'ai_always', 'heuristic', 'off']}
          tip="How 'Waiting on them' is detected when a user replies. pregate_ai (default): a free check skips obvious thanks/done, AI judges the rest. ai_always: AI judges every reply (most accurate, most cost). heuristic: no AI. off: feature disabled."
        />
        <Select
          label="Draft send mode"
          value={sendMode}
          onChange={setSendMode}
          options={['', 'graph', 'draft_only']}
          tip="graph: Approve & Send really sends the reply via Outlook. draft_only: it saves the reply to the user's Outlook Drafts instead and they send it from there."
        />
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

/** A small "ⓘ" the operator can hover for the field's explanation. */
function TipDot({ tip }: { tip: string }) {
  return (
    <span
      title={tip}
      aria-label={tip}
      className="grid h-[15px] w-[15px] flex-none cursor-help place-items-center rounded-full border border-line text-[10px] font-semibold text-muted transition hover:border-accent hover:text-accent"
    >
      i
    </span>
  );
}

function Field({
  label,
  hint,
  tip,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint?: string;
  /** Hover explanation of what to enter (title tooltip on the label + input). */
  tip?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
        {label}
        {tip && <TipDot tip={tip} />}
      </span>
      <input
        value={value}
        placeholder={placeholder}
        title={tip}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[10px] border border-line bg-field px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
      />
      {hint && <span className="text-[11.5px] text-muted">{hint}</span>}
    </label>
  );
}

function Select({
  label,
  tip,
  value,
  onChange,
  options,
}: {
  label: string;
  /** Hover explanation of what each choice means. */
  tip?: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
        {label}
        {tip && <TipDot tip={tip} />}
      </span>
      <select
        value={value}
        title={tip}
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
