'use server';

import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import {
  buildMeetingPrepPrompt,
  parseMeetingPrep,
  MEETING_PREP_PROMPT_VERSION,
  type MeetingPrep,
  type PrepOpenItem,
  type PrepThread,
} from '@/lib/ai/meeting-prep';
import { getEffectiveAi } from '@/lib/ai/runtime';
import { estimateCostUsd } from '@/lib/ai/cost';
import { recordAiUsage } from '@/lib/ai/usage';
import { dayKeyInTz } from '@/lib/meetings/group';
import { longTodayInTz } from '@/lib/time/zone';

/**
 * Meeting Prep (Phase 12 v1) — one AI call per click: gather what Vesta
 * already knows about the attendees (their recent inbound threads + the open
 * radar items hanging off those conversations, all RLS-scoped own data) and
 * write the one-page prep. The model only ever sees context we hand it; the
 * parser clamps the result. Cost lands in ai_usage under feature 'prep'.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PrepResult =
  | { ok: true; prep: MeetingPrep; threadCount: number }
  | { ok: false; error: string };

export async function generateMeetingPrep(input: {
  subject: string;
  /** Meeting start, UTC instant (shown to the model in manager time). */
  startIso: string;
  organizer: string | null;
  attendees: string[];
}): Promise<PrepResult> {
  const user = await requireUser();

  // Validate the client-supplied shape (it came from our own calendar view,
  // but server-side gates never trust the browser).
  const subject = String(input.subject ?? '').trim().slice(0, 200) || '(no subject)';
  const start = new Date(input.startIso ?? '');
  if (Number.isNaN(start.getTime())) return { ok: false, error: 'Invalid meeting time.' };
  const attendees = [...new Set((input.attendees ?? []).map((a) => String(a).toLowerCase().trim()))]
    .filter((a) => EMAIL_RE.test(a))
    .slice(0, 20);

  const supabase = createClient();
  const { data: profile } = await supabase.from('profiles').select('timezone').maybeSingle();
  const tz = profile?.timezone || 'UTC';

  // Recent inbound mail, filtered to the attendees in JS so sender-email
  // casing never hides a match (stored casing varies by sender).
  const { data: recent } = await supabase
    .from('email_messages')
    .select('subject, body_preview, sender_name, sender_email, received_at, graph_conversation_id')
    .eq('direction', 'inbound')
    .is('deleted_at', null)
    .order('received_at', { ascending: false })
    .limit(300);

  const attendeeSet = new Set(attendees);
  const matched = (recent ?? []).filter((m) =>
    m.sender_email ? attendeeSet.has(m.sender_email.toLowerCase()) : false,
  );

  // One line per conversation (latest message wins), newest first, capped.
  const seen = new Set<string>();
  const threads: PrepThread[] = [];
  const convIds: string[] = [];
  for (const m of matched) {
    const key = m.graph_conversation_id || `msg:${m.subject}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (m.graph_conversation_id) convIds.push(m.graph_conversation_id);
    threads.push({
      subject: m.subject?.trim() || '(no subject)',
      from: m.sender_name || m.sender_email || 'Unknown',
      date: m.received_at ? dayKeyInTz(m.received_at, tz) : '?',
      preview: (m.body_preview ?? '').replace(/\s+/g, ' ').trim().slice(0, 180),
    });
    if (threads.length >= 10) break;
  }

  // Open radar items hanging off those conversations.
  let openItems: PrepOpenItem[] = [];
  if (convIds.length > 0) {
    const { data: items } = await supabase
      .from('work_items')
      .select('title, category, due_at')
      .eq('status', 'open')
      .in('source_external_id', convIds.slice(0, 25))
      .limit(8);
    openItems = (items ?? []).map((i) => ({
      title: i.title ?? '(untitled)',
      category: i.category,
      due: i.due_at ? dayKeyInTz(i.due_at, tz) : null,
    }));
  }

  const eff = await getEffectiveAi(user.id, 'analysis');
  if (!eff) return { ok: false, error: 'AI is not configured.' };
  if (eff.blocked) return { ok: false, error: eff.blockedReason ?? 'AI is paused for this account.' };
  const { cfg, client, rates } = eff;

  const whenLocal = start.toLocaleString('en-US', {
    timeZone: tz,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  try {
    const prompt = buildMeetingPrepPrompt({
      subject,
      whenLocal,
      organizer: input.organizer ? String(input.organizer).slice(0, 120) : null,
      attendees,
      threads,
      openItems,
      today: longTodayInTz(tz),
    });
    const res = await client.complete(prompt);
    const prep = parseMeetingPrep(res.content);

    await recordAiUsage({
      userId: user.id,
      feature: 'prep',
      provider: cfg.provider,
      model: cfg.model,
      tokenInput: res.usage.inputTokens,
      tokenOutput: res.usage.outputTokens,
      costUsd: estimateCostUsd(cfg.model, res.usage, rates),
      metadata: { prompt_version: MEETING_PREP_PROMPT_VERSION },
    });

    return { ok: true, prep, threadCount: threads.length };
  } catch (err) {
    await recordAiUsage({
      userId: user.id,
      feature: 'prep',
      provider: cfg.provider,
      model: cfg.model,
      error: err instanceof Error ? err.message : 'meeting prep failed',
      metadata: { prompt_version: MEETING_PREP_PROMPT_VERSION },
    });
    return { ok: false, error: 'Could not write the prep — try again in a moment.' };
  }
}
