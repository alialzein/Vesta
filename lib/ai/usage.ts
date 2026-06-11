import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import type { Json } from '@/lib/database.types';

export type AiFeature =
  | 'analysis'
  | 'draft'
  | 'reply_intent'
  | 'capture'
  | 'brief'
  | 'chat'
  | 'triage'
  | 'other';

/**
 * Record one AI call in the unified `ai_usage` ledger. This is the single place
 * every AI feature reports tokens + cost, so the admin AI Control Center can roll
 * up spend per user and per feature (broader than ai_analyses, which only covers
 * analysis). Best-effort: never throw into the calling AI path.
 */
export async function recordAiUsage(entry: {
  userId: string | null;
  feature: AiFeature;
  provider?: string | null;
  model?: string | null;
  tokenInput?: number;
  tokenOutput?: number;
  requestCount?: number;
  costUsd?: number | null;
  workItemId?: string | null;
  error?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from('ai_usage').insert({
      user_id: entry.userId,
      feature: entry.feature,
      provider: entry.provider ?? null,
      model: entry.model ?? null,
      token_input: entry.tokenInput ?? 0,
      token_output: entry.tokenOutput ?? 0,
      request_count: entry.requestCount ?? 1,
      cost_estimate_usd: entry.costUsd ?? null,
      work_item_id: entry.workItemId ?? null,
      error: entry.error ?? null,
      metadata: (entry.metadata ?? {}) as Json,
    });
  } catch {
    /* ledger is observability only — don't break the AI path */
  }
}
