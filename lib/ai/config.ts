/**
 * Phase 7 — AI provider configuration, read from env so the provider, model, and
 * key can be swapped without a code change (and later from the admin panel).
 *
 *   AI_PROVIDER = openai | anthropic
 *   AI_MODEL    = e.g. gpt-5.4-mini
 *   AI_API_KEY  = the secret for the selected provider (server-only)
 *
 * Cost guards keep spend bounded:
 *   AI_MAX_PER_RUN (default 20) — items analyzed per sync run
 *   AI_MAX_PER_DAY (default 200) — items analyzed per user per day
 */

export type AiProviderName = 'openai' | 'anthropic';

export type AiConfig = {
  provider: AiProviderName;
  model: string;
  apiKey: string;
  maxPerRun: number;
  maxPerDay: number;
};

function intEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

/** Returns the AI config, or null when it isn't fully configured (AI then no-ops). */
export function getAiConfig(): AiConfig | null {
  const provider = (process.env.AI_PROVIDER ?? '').trim().toLowerCase();
  const model = (process.env.AI_MODEL ?? '').trim();
  const apiKey = (process.env.AI_API_KEY ?? '').trim();
  if (!model || !apiKey) return null;
  if (provider !== 'openai' && provider !== 'anthropic') return null;
  return {
    provider,
    model,
    apiKey,
    maxPerRun: intEnv('AI_MAX_PER_RUN', 20),
    maxPerDay: intEnv('AI_MAX_PER_DAY', 200),
  };
}

export function isAiConfigured(): boolean {
  return getAiConfig() !== null;
}

/**
 * How "Waiting on them" detection (Phase 8) decides whether the manager's reply
 * expects a response:
 *   pregate_ai (default) — a free heuristic skips obvious "thanks/done" replies; AI
 *                          judges only the plausible asks (best cost/accuracy).
 *   ai_always            — AI judges every reply (most thorough, most cost).
 *   heuristic            — heuristic only, no AI call.
 *   off                  — don't create "waiting on them" items at all.
 * Env-driven now (AI_REPLY_INTENT_MODE); per-user from the admin panel later.
 */
export type ReplyIntentMode = 'pregate_ai' | 'ai_always' | 'heuristic' | 'off';

export function getReplyIntentMode(): ReplyIntentMode {
  const v = (process.env.AI_REPLY_INTENT_MODE ?? '').trim().toLowerCase();
  if (v === 'ai_always' || v === 'heuristic' || v === 'off') return v;
  return 'pregate_ai';
}
