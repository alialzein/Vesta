import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/lib/database.types';
import { getAiConfig } from './config';
import { getAiClient } from './client';
import { buildPrompt, bodyForAi } from './context';
import { parseAnalysis, PROMPT_VERSION } from './schema';
import { estimateCostUsd } from './cost';

type DbClient = SupabaseClient<Database>;
type AnalysisInsert = Database['public']['Tables']['ai_analyses']['Insert'];

export type AnalyzeResult = { analyzed: number; skipped: number; errors: number };

const EMPTY: AnalyzeResult = { analyzed: 0, skipped: 0, errors: 0 };

/**
 * Phase 7 — analyze the actionable work_items of one mailbox with AI and persist
 * the results. Runs after a sync. Cost-bounded:
 *  - only open Outlook items (highest priority first),
 *  - skipped when already analyzed at/after the latest message (analyze once per
 *    change),
 *  - capped per run and per user per day.
 * No-ops silently when AI isn't configured, so non-AI environments are unaffected.
 * Best-effort: a failure on one item never breaks the sync.
 */
export async function analyzeMailboxWorkItems(
  db: DbClient,
  ctx: { userId: string; mailboxId: string },
): Promise<AnalyzeResult> {
  const cfg = getAiConfig();
  const client = getAiClient();
  if (!cfg || !client) return EMPTY;

  // Daily cap — count this user's analyses since local midnight (UTC-based here).
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count: todayCount } = await db
    .from('ai_analyses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ctx.userId)
    .gte('created_at', dayStart.toISOString());
  let budget = Math.min(cfg.maxPerRun, cfg.maxPerDay - (todayCount ?? 0));
  if (budget <= 0) return EMPTY;

  const { data: items } = await db
    .from('work_items')
    .select('id, user_id, title, source_external_id, last_analyzed_at')
    .eq('mailbox_id', ctx.mailboxId)
    .eq('source', 'outlook')
    .eq('status', 'open')
    .order('priority_score', { ascending: false })
    .limit(100);

  let analyzed = 0;
  let skipped = 0;
  let errors = 0;

  for (const w of items ?? []) {
    if (budget <= 0) break;
    if (!w.source_external_id) {
      skipped++;
      continue;
    }

    const { data: thread } = await db
      .from('email_threads')
      .select(
        'latest_message_at, latest_inbound_at, followup_count, inbound_after_last_outbound_count, is_waiting_on_manager',
      )
      .eq('mailbox_id', ctx.mailboxId)
      .eq('graph_conversation_id', w.source_external_id)
      .maybeSingle();

    const latestAt = thread?.latest_inbound_at ?? thread?.latest_message_at ?? null;
    // Already analyzed the current state → skip (analyze once per change).
    if (w.last_analyzed_at && latestAt && new Date(w.last_analyzed_at) >= new Date(latestAt)) {
      skipped++;
      continue;
    }

    const { data: msgs } = await db
      .from('email_messages')
      .select('subject, sender_name, body_text, body_html, body_preview, received_at')
      .eq('mailbox_id', ctx.mailboxId)
      .eq('graph_conversation_id', w.source_external_id)
      .eq('direction', 'inbound')
      .is('deleted_at', null)
      .order('received_at', { ascending: false })
      .limit(1);
    const m = msgs?.[0];

    const prompt = buildPrompt({
      subject: m?.subject ?? w.title ?? null,
      latestMessage: bodyForAi({
        body_text: m?.body_text,
        body_html: m?.body_html,
        body_preview: m?.body_preview,
      }),
      senderName: m?.sender_name ?? null,
      messageCount: (thread?.inbound_after_last_outbound_count ?? 0) + 1,
      followupCount: thread?.followup_count ?? 0,
      isWaitingOnManager: thread?.is_waiting_on_manager ?? true,
      latestAt,
    });

    budget--; // count every attempt (success or failure) against the budget
    try {
      const { content, usage } = await client.complete(prompt);
      const analysis = parseAnalysis(content);
      const cost = estimateCostUsd(cfg.model, usage);
      const nowIso = new Date().toISOString();

      const record: AnalysisInsert = {
        user_id: w.user_id,
        work_item_id: w.id,
        model: cfg.model,
        prompt_version: PROMPT_VERSION,
        input_summary: prompt.user.slice(0, 500),
        output: analysis as unknown as Json,
        priority_score: analysis.priority,
        category: analysis.category,
        user_visible_reason: analysis.reason,
        token_input: usage.inputTokens,
        token_output: usage.outputTokens,
        cost_estimate_usd: cost,
      };
      await db.from('ai_analyses').insert(record);

      await db
        .from('work_items')
        .update({
          summary: analysis.summary,
          category: analysis.category,
          priority_score: analysis.priority,
          suggested_action: analysis.nextAction,
          urgency_reason: analysis.reason,
          due_at: analysis.deadline ? `${analysis.deadline}T09:00:00Z` : null,
          last_analyzed_at: nowIso,
          analysis_version: 1,
        })
        .eq('id', w.id);

      analyzed++;
    } catch (e) {
      errors++;
      const record: AnalysisInsert = {
        user_id: w.user_id,
        work_item_id: w.id,
        model: cfg.model,
        prompt_version: PROMPT_VERSION,
        error: e instanceof Error ? e.message : 'AI analysis failed',
      };
      await db.from('ai_analyses').insert(record);
    }
  }

  return { analyzed, skipped, errors };
}
