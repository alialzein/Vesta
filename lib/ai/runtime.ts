import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import { getAiConfig, getReplyIntentMode, type AiConfig, type ReplyIntentMode } from './config';
import { getAiClient } from './client';
import { createOpenAiClient } from './providers/openai';
import type { AiClient } from './types';
import type { CostRates } from './cost';
import { getAppSettings, getUserSettings } from '@/lib/admin/settings';

/**
 * Admin Wave 4 — the EFFECTIVE AI runtime config: env defaults overlaid with the
 * admin panel's app_settings and the user's user_settings. This is what makes
 * the AI Control Center's knobs real levers instead of stored-but-ignored values:
 *
 *   - provider/model (+ per-task analysis/draft models)
 *   - max analyses per run / per day
 *   - token prices (cost estimates)
 *   - per-user AI pause and daily cost caps (global + per-user)
 *   - reply-intent mode (global override, then per-user)
 *
 * The API key always stays in env. If the operator overrides the provider, the
 * env key must belong to that provider — failures surface in the usage ledger.
 * Everything degrades gracefully: with no DB settings, behavior === env.
 */

export type AiTask = 'analysis' | 'draft';

export type EffectiveAi = {
  cfg: AiConfig;
  client: AiClient;
  rates: CostRates | null;
  replyIntentMode: ReplyIntentMode;
  /** True when AI must not run for this user right now (paused or over a cap). */
  blocked: boolean;
  /** User-visible reason when blocked (for logs/ledger). */
  blockedReason: string | null;
};

function clientFor(provider: string, apiKey: string, model: string): AiClient | null {
  if (provider === 'openai') return createOpenAiClient(apiKey, model);
  // 'anthropic' adapter not implemented yet — same behavior as lib/ai/client.ts.
  return null;
}

/**
 * Resolve the effective AI config for one user + task. Returns null when AI is
 * not configured at all (env has no key/model — same no-op contract as before).
 */
export async function getEffectiveAi(userId: string, task: AiTask): Promise<EffectiveAi | null> {
  const envCfg = getAiConfig();
  if (!envCfg) return null;

  // Settings reads are best-effort: any DB trouble falls back to pure env.
  let app: Awaited<ReturnType<typeof getAppSettings>> | null = null;
  let user: Awaited<ReturnType<typeof getUserSettings>> | null = null;
  try {
    [app, user] = await Promise.all([getAppSettings(), getUserSettings(userId)]);
  } catch {
    /* fall through with env only */
  }

  const provider = ((app?.ai_provider ?? envCfg.provider) as AiConfig['provider']) || envCfg.provider;
  const taskModel = task === 'draft' ? app?.ai_model_draft : app?.ai_model_analysis;
  const model = (taskModel ?? app?.ai_model ?? envCfg.model).trim() || envCfg.model;

  const cfg: AiConfig = {
    provider,
    model,
    apiKey: envCfg.apiKey,
    maxPerRun: app?.ai_max_per_run ?? envCfg.maxPerRun,
    maxPerDay: app?.ai_max_per_day ?? envCfg.maxPerDay,
  };

  const client =
    provider === envCfg.provider && model === envCfg.model
      ? getAiClient()
      : clientFor(provider, envCfg.apiKey, model);
  if (!client) return null;

  const rates: CostRates | null =
    app?.ai_price_input != null && app?.ai_price_output != null
      ? { input: Number(app.ai_price_input), output: Number(app.ai_price_output) }
      : null;

  const replyIntentEnv = getReplyIntentMode();
  const replyIntentMode = (user?.reply_intent_mode ??
    app?.reply_intent_mode ??
    replyIntentEnv) as ReplyIntentMode;

  // Pause + daily cost caps. Cap checks read today's ledger once.
  let blocked = false;
  let blockedReason: string | null = null;
  if (user?.ai_paused) {
    blocked = true;
    blockedReason = 'AI is paused for this user (admin setting).';
  } else {
    const userCap = user?.ai_daily_cost_cap_usd != null ? Number(user.ai_daily_cost_cap_usd) : null;
    const globalCap =
      app?.ai_daily_cost_cap_usd != null ? Number(app.ai_daily_cost_cap_usd) : null;
    if (userCap !== null || globalCap !== null) {
      const spend = await todaysSpend(userId, rates);
      if (userCap !== null && spend.user >= userCap) {
        blocked = true;
        blockedReason = `User daily AI cost cap reached ($${userCap.toFixed(2)}).`;
      } else if (globalCap !== null && spend.global >= globalCap) {
        blocked = true;
        blockedReason = `Global daily AI cost cap reached ($${globalCap.toFixed(2)}).`;
      }
    }
  }

  return { cfg, client, rates, replyIntentMode, blocked, blockedReason };
}

/** Today's estimated spend (USD) for the user and globally, from the ledger. */
async function todaysSpend(
  userId: string,
  rates: CostRates | null,
): Promise<{ user: number; global: number }> {
  try {
    const svc = createServiceClient();
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { data } = await svc
      .from('ai_usage')
      .select('user_id, token_input, token_output, cost_estimate_usd')
      .gte('created_at', dayStart.toISOString());
    let user = 0;
    let global = 0;
    for (const r of data ?? []) {
      const cost =
        r.cost_estimate_usd != null
          ? Number(r.cost_estimate_usd)
          : rates
            ? (Number(r.token_input ?? 0) * rates.input +
                Number(r.token_output ?? 0) * rates.output) /
              1_000_000
            : 0;
      global += cost;
      if (r.user_id === userId) user += cost;
    }
    return { user, global };
  } catch {
    return { user: 0, global: 0 }; // never block on a read failure
  }
}

/**
 * The effective reply-intent mode for a user (user → global → env), independent
 * of whether AI is configured — the sync engine's pre-gate needs it even when
 * getEffectiveAi would return null/blocked.
 */
export async function getEffectiveReplyIntentMode(userId: string): Promise<ReplyIntentMode> {
  try {
    const [app, user] = await Promise.all([getAppSettings(), getUserSettings(userId)]);
    const v = ((user?.reply_intent_mode ?? app?.reply_intent_mode ?? '') as string).trim();
    if (v === 'pregate_ai' || v === 'ai_always' || v === 'heuristic' || v === 'off') return v;
  } catch {
    /* fall back to env */
  }
  return getReplyIntentMode();
}

/** The effective draft send mode for a user: user override → global → env. */
export async function getEffectiveSendMode(userId: string): Promise<'graph' | 'draft_only'> {
  try {
    const [app, user] = await Promise.all([getAppSettings(), getUserSettings(userId)]);
    const v = (user?.draft_send_mode ?? app?.draft_send_mode ?? '').trim().toLowerCase();
    if (v === 'draft_only' || v === 'graph') return v;
  } catch {
    /* fall back to env */
  }
  return (process.env.DRAFT_SEND_MODE ?? '').trim().toLowerCase() === 'draft_only'
    ? 'draft_only'
    : 'graph';
}
