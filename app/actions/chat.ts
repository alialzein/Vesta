'use server';

import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';
import {
  buildChatPrompt,
  isDuplicateMemory,
  parseChatReply,
  titleFromMessage,
  CHAT_PROMPT_VERSION,
  type ChatContext,
  type ChatTurn,
} from '@/lib/ai/chat';
import { toMessageView, type ChatMessageView, type MessageRow } from '@/lib/chat/data';
import { getEffectiveAi } from '@/lib/ai/runtime';
import { estimateCostUsd } from '@/lib/ai/cost';
import { recordAiUsage } from '@/lib/ai/usage';
import { safeTz, todayInTz } from '@/lib/time/zone';

/**
 * Ask Vesta chat — server actions.
 *
 * Each turn: gather the manager's world (standing memories, rules, today's
 * real workload, today's briefing + inbox brief), one AI call, store both
 * turns, and write whatever Vesta chose to remember into manager_memories
 * (source='chat') so it is visible — and deletable — in Memory & Rules.
 * Privacy: context goes only to the configured AI provider, exactly like
 * analysis/drafting; nothing else leaves the app.
 */

const MESSAGE_CAP = 4000;

export type SendChatResult =
  | { ok: true; conversationId: string; message: ChatMessageView }
  | { ok: false; error: string };

export async function sendChatMessage(input: {
  conversationId: string | null;
  text: string;
}): Promise<SendChatResult> {
  const user = await requireUser();
  const supabase = createClient();

  const text = (input.text ?? '').trim().slice(0, MESSAGE_CAP);
  if (!text) return { ok: false, error: 'Say something first.' };

  // ---- Conversation (create on first message) -----------------------------
  let conversationId = input.conversationId;
  if (conversationId) {
    const { data } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle();
    if (!data) conversationId = null; // stale id → start fresh
  }
  if (!conversationId) {
    const { data, error } = await supabase
      .from('chat_conversations')
      .insert({ user_id: user.id, title: titleFromMessage(text) })
      .select('id')
      .single();
    if (error || !data) return { ok: false, error: error?.message ?? 'Could not start the conversation.' };
    conversationId = data.id;
  }

  const { error: userMsgError } = await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    user_id: user.id,
    role: 'user',
    content: text,
  });
  if (userMsgError) return { ok: false, error: userMsgError.message };

  // ---- The manager's world, in parallel -----------------------------------
  const [
    { data: profile },
    { data: memoryRows },
    { data: ruleRows },
    { data: workRows },
    { data: historyRows },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, role, timezone').eq('id', user.id).maybeSingle(),
    supabase
      .from('manager_memories')
      .select('memory_type, memory_text')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(40),
    supabase
      .from('manager_rules')
      .select('name, description')
      .eq('is_enabled', true)
      .order('priority', { ascending: false })
      .limit(10),
    supabase
      .from('work_items')
      .select('title, summary, category, priority_score, due_at, suggested_action, urgency_reason, status, snoozed_until')
      .in('status', ['open', 'snoozed'])
      .order('priority_score', { ascending: false })
      .limit(60),
    supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(21),
  ]);

  const tz = safeTz(profile?.timezone);
  const briefDate = todayInTz(tz);

  // Today's briefing headlines + inbox brief are nice-to-have context.
  const [{ data: briefingRows }, { data: dailyBrief }] = await Promise.all([
    supabase
      .from('briefing_items')
      .select('title')
      .eq('brief_date', briefDate)
      .neq('status', 'dismissed')
      .order('rank', { ascending: true })
      .limit(8),
    supabase
      .from('daily_briefs')
      .select('summary')
      .eq('brief_date', briefDate)
      .maybeSingle(),
  ]);

  // Mirror the radar's visibility rule: open + lapsed-snooze items.
  const nowMs = Date.now();
  const visible = (workRows ?? []).filter(
    (r) =>
      r.status !== 'snoozed' ||
      (r.snoozed_until != null && new Date(r.snoozed_until).getTime() <= nowMs),
  );

  const history: ChatTurn[] = ((historyRows ?? []) as MessageRow[])
    .reverse()
    .filter((m) => m.content !== text || m.role !== 'user') // drop the turn we just inserted
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

  const context: ChatContext = {
    managerName: profile?.full_name ?? null,
    role: profile?.role ?? null,
    timezone: tz,
    now: new Date().toLocaleString('en-US', {
      timeZone: tz,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    memories: (memoryRows ?? []).map((m) => ({ type: m.memory_type, text: m.memory_text })),
    rules: (ruleRows ?? []).map((r) => ({ name: r.name, description: r.description })),
    workCounts: {
      open: visible.length,
      waiting: visible.filter((r) => r.category === 'waiting').length,
      drafts: 0, // count of pending drafts is on the nav badge; not vital here
    },
    workItems: visible.slice(0, 15).map((r) => ({
      title: r.title,
      category: r.category,
      priority: r.priority_score,
      dueAt: r.due_at,
      summary: r.summary,
      reason: r.urgency_reason,
      suggestedAction: r.suggested_action,
    })),
    briefingHeadlines: (briefingRows ?? []).map((b) => b.title),
    dailyBrief: dailyBrief?.summary ?? null,
  };

  // ---- One AI call ---------------------------------------------------------
  const eff = await getEffectiveAi(user.id, 'analysis');
  if (!eff) return { ok: false, error: 'AI is not configured.' };
  if (eff.blocked) return { ok: false, error: eff.blockedReason ?? 'AI is paused for this account.' };
  const { cfg, client, rates } = eff;

  const prompt = buildChatPrompt({ context, history, message: text });

  try {
    const res = await client.complete(prompt);
    const parsed = parseChatReply(res.content);

    // ---- Learning: save new facts into Memory & Rules ----------------------
    const existingTexts = (memoryRows ?? []).map((m) => m.memory_text);
    const fresh = parsed.remember.filter((m) => !isDuplicateMemory(m.text, existingTexts));
    if (fresh.length > 0) {
      await supabase.from('manager_memories').insert(
        fresh.map((m) => ({
          user_id: user.id,
          memory_type: m.type,
          memory_text: m.text,
          scope: 'global',
          source: 'chat',
          confidence: 0.9,
          is_active: true,
          metadata: { learned_via: 'chat', conversation_id: conversationId } as Json,
        })),
      );
    }

    const learned = fresh.map((m) => m.text);
    const { data: aiMsg, error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: parsed.reply,
        metadata: {
          learned,
          model: cfg.model,
          prompt_version: CHAT_PROMPT_VERSION,
        } as Json,
      })
      .select('*')
      .single();
    if (aiMsgError || !aiMsg) {
      return { ok: false, error: aiMsgError?.message ?? 'Could not save the reply.' };
    }

    await Promise.all([
      supabase
        .from('chat_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId),
      recordAiUsage({
        userId: user.id,
        feature: 'chat',
        provider: cfg.provider,
        model: cfg.model,
        tokenInput: res.usage.inputTokens,
        tokenOutput: res.usage.outputTokens,
        costUsd: estimateCostUsd(cfg.model, res.usage, rates),
        metadata: {
          kind: 'chat_turn',
          prompt_version: CHAT_PROMPT_VERSION,
          learned: learned.length,
        },
      }),
    ]);

    return { ok: true, conversationId, message: toMessageView(aiMsg as MessageRow) };
  } catch (err) {
    await recordAiUsage({
      userId: user.id,
      feature: 'chat',
      provider: cfg.provider,
      model: cfg.model,
      error: err instanceof Error ? err.message : 'chat turn failed',
      metadata: { kind: 'chat_turn', prompt_version: CHAT_PROMPT_VERSION },
    });
    return { ok: false, error: 'Vesta could not answer just now — try again in a moment.' };
  }
}

/** Delete one conversation (and its messages, via cascade). */
export async function deleteChatConversation(
  conversationId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const supabase = createClient();
  const { error } = await supabase.from('chat_conversations').delete().eq('id', conversationId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
