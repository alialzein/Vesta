import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/lib/database.types';

export type AppSettings = Database['public']['Tables']['app_settings']['Row'];
export type UserSettings = Database['public']['Tables']['user_settings']['Row'];
export type AppSettingsPatch = Database['public']['Tables']['app_settings']['Update'];
export type UserSettingsPatch = Database['public']['Tables']['user_settings']['Insert'];

/** Built-in fallbacks used when a global setting is unset (mirror env defaults). */
export const SETTING_DEFAULTS = {
  initial_scan_back_days: 7,
  soft_delete_grace_days: 30,
  ai_max_per_run: 20,
  ai_max_per_day: 200,
  reply_intent_mode: 'pregate_ai',
  draft_send_mode: 'graph',
} as const;

/** The global operator settings (single row). Falls back to a defaults shape. */
export async function getAppSettings(): Promise<AppSettings> {
  const svc = createServiceClient();
  const { data } = await svc.from('app_settings').select('*').eq('id', true).maybeSingle();
  if (data) return data;
  // The migration seeds the row; if somehow missing, return an in-memory default
  // so the panel still renders (save will upsert it).
  return {
    id: true,
    initial_scan_back_days: SETTING_DEFAULTS.initial_scan_back_days,
    retention_months: null,
    soft_delete_grace_days: SETTING_DEFAULTS.soft_delete_grace_days,
    ai_provider: null,
    ai_model: null,
    ai_model_analysis: null,
    ai_model_draft: null,
    ai_max_per_run: null,
    ai_max_per_day: null,
    ai_price_input: null,
    ai_price_output: null,
    ai_daily_cost_cap_usd: null,
    reply_intent_mode: null,
    draft_send_mode: null,
    feature_flags: {},
    updated_at: new Date().toISOString(),
    updated_by: null,
  };
}

/** Persist a patch to the global settings (upserts the singleton row). */
export async function saveAppSettings(patch: AppSettingsPatch, actorId: string): Promise<void> {
  const svc = createServiceClient();
  await svc
    .from('app_settings')
    .upsert({ id: true, ...patch, updated_by: actorId }, { onConflict: 'id' });
}

/** Per-user overrides, or null when none have been set. */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const svc = createServiceClient();
  const { data } = await svc.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
  return data ?? null;
}

/** Per-user overrides for many users at once (keyed by user_id). */
export async function getUserSettingsMap(userIds: string[]): Promise<Map<string, UserSettings>> {
  if (userIds.length === 0) return new Map();
  const svc = createServiceClient();
  const { data } = await svc.from('user_settings').select('*').in('user_id', userIds);
  return new Map((data ?? []).map((r) => [r.user_id, r]));
}

/** Upsert a per-user override patch. */
export async function saveUserSettings(
  userId: string,
  patch: Omit<UserSettingsPatch, 'user_id'>,
  actorId: string,
): Promise<void> {
  const svc = createServiceClient();
  await svc
    .from('user_settings')
    .upsert({ user_id: userId, ...patch, updated_by: actorId }, { onConflict: 'user_id' });
}

/**
 * Effective AI overrides for a user: per-user wins over global; null means
 * "fall back to env / built-in" (the caller, e.g. lib/ai/store.ts, overlays
 * these onto the env-based config). Keeps DB optional — AI still runs with only
 * env set.
 */
export async function resolveAiOverrides(userId: string): Promise<{
  model: string | null;
  maxPerRun: number | null;
  maxPerDay: number | null;
  priceInput: number | null;
  priceOutput: number | null;
  paused: boolean;
}> {
  const [app, user] = await Promise.all([getAppSettings(), getUserSettings(userId)]);
  return {
    model: app.ai_model_analysis ?? app.ai_model ?? null,
    maxPerRun: app.ai_max_per_run ?? null,
    maxPerDay: app.ai_max_per_day ?? null,
    priceInput: app.ai_price_input ?? null,
    priceOutput: app.ai_price_output ?? null,
    paused: user?.ai_paused ?? false,
  };
}

/**
 * The admin-configured token prices (USD per 1M tokens), or null when unset.
 * Passed into estimateCostUsd so panel pricing actually drives cost estimates
 * (env AI_PRICE_INPUT/OUTPUT remains the fallback inside the calculator).
 */
export async function getConfiguredAiRates(): Promise<{ input: number; output: number } | null> {
  const app = await getAppSettings();
  const input = app.ai_price_input === null ? NaN : Number(app.ai_price_input);
  const output = app.ai_price_output === null ? NaN : Number(app.ai_price_output);
  if (Number.isFinite(input) && Number.isFinite(output)) return { input, output };
  return null;
}

/** Effective retention policy for a user (per-user override beats the global). */
export async function resolveRetention(
  userId: string,
  app?: AppSettings,
): Promise<{ retentionMonths: number | null; softDeleteGraceDays: number; scanBackDays: number }> {
  const settings = app ?? (await getAppSettings());
  const user = await getUserSettings(userId);
  return {
    retentionMonths: user?.retention_months ?? settings.retention_months ?? null,
    softDeleteGraceDays: settings.soft_delete_grace_days ?? SETTING_DEFAULTS.soft_delete_grace_days,
    scanBackDays:
      user?.initial_scan_back_days ??
      settings.initial_scan_back_days ??
      SETTING_DEFAULTS.initial_scan_back_days,
  };
}
