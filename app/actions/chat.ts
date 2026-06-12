'use server';

import { requireUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/database.types';
import {
  actionLabel,
  buildChatPrompt,
  emailsInText,
  isDuplicateMemory,
  parseChatReply,
  titleFromMessage,
  CHAT_PROMPT_VERSION,
  type ChatContext,
  type ChatTurn,
} from '@/lib/ai/chat';
import { getValidAccessToken, hasCalendarScope } from '@/lib/graph/tokens';
import { createMeeting, fetchCalendarView, meetingLinesForChat } from '@/lib/graph/calendar';
import {
  toMessageView,
  type ChatMessageView,
  type MessageRow,
  type StoredChatAction,
} from '@/lib/chat/data';
import { getEffectiveAi } from '@/lib/ai/runtime';
import { estimateCostUsd } from '@/lib/ai/cost';
import { recordAiUsage } from '@/lib/ai/usage';
import { safeTz, todayInTz, zonedTimeToUtc } from '@/lib/time/zone';
import { clampSchedule } from '@/lib/reminders/logic';
import { createManualTask, resolveWorkItem, snoozeWorkItem } from './work-items';
import { generateDraft } from './drafts';

/**
 * Ask Vesta chat — server actions.
 *
 * Each turn: gather the manager's world (standing memories, rules, today's
 * real workload, today's briefing + inbox brief), one AI call, store both
 * turns, and write whatever Vesta chose to remember into manager_memories
 * (source='chat') so it is visible — and deletable — in Memory & Rules.
 *
 * Chat orders (Phase A): the model may PROPOSE one action per turn (mark
 * done / snooze / create task / draft reply). The proposal is stored on the
 * assistant message (metadata.action, status 'proposed') and NOTHING runs
 * until the manager taps Confirm — executeChatAction then re-validates and
 * calls the very same server actions the dashboard buttons use.
 *
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
    { data: mailbox },
    { data: peopleRows },
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
      .select('id, title, summary, category, priority_score, due_at, suggested_action, urgency_reason, status, snoozed_until')
      .in('status', ['open', 'snoozed'])
      .order('priority_score', { ascending: false })
      .limit(60),
    supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(21),
    supabase
      .from('mailboxes')
      .select('id, integration_id')
      .eq('status', 'active')
      .limit(1)
      .maybeSingle(),
    // Known correspondents — the only attendee emails the model may use
    // (besides ones the manager types). VIPs first, then most recently seen.
    supabase
      .from('people')
      .select('display_name, email')
      .not('email', 'is', null)
      .order('is_vip', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(15),
  ]);

  const tz = safeTz(profile?.timezone);
  const briefDate = todayInTz(tz);

  // ---- Calendar (Phase C): today's meetings, when the scope is granted -----
  // Best-effort: any Graph trouble just means the block is absent this turn.
  let calendarEnabled = false;
  let meetings: string[] = [];
  if (mailbox?.integration_id) {
    try {
      calendarEnabled = await hasCalendarScope(mailbox.integration_id);
      if (calendarEnabled) {
        const token = await getValidAccessToken(mailbox.integration_id);
        if (token) {
          const dayStart = zonedTimeToUtc(briefDate, '00:00', tz);
          const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
          const events = await fetchCalendarView(
            token,
            dayStart.toISOString(),
            dayEnd.toISOString(),
          );
          meetings = meetingLinesForChat(events, tz);
        }
      }
    } catch {
      /* calendar context is optional */
    }
  }

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
    calendarEnabled,
    meetings,
    people: (peopleRows ?? [])
      .filter((p): p is { display_name: string | null; email: string } => Boolean(p.email))
      .map((p) => ({ name: p.display_name, email: p.email.toLowerCase() })),
  };

  // ---- One AI call ---------------------------------------------------------
  const eff = await getEffectiveAi(user.id, 'analysis');
  if (!eff) return { ok: false, error: 'AI is not configured.' };
  if (eff.blocked) return { ok: false, error: eff.blockedReason ?? 'AI is paused for this account.' };
  const { cfg, client, rates } = eff;

  const prompt = buildChatPrompt({ context, history, message: text });

  try {
    const res = await client.complete(prompt);
    const shownItems = visible.slice(0, 15);
    // Attendee anti-invention gate: known people + any email the manager
    // actually typed in this conversation.
    const allowedAttendees = [
      ...context.people.map((p) => p.email),
      ...emailsInText(text),
      ...history.filter((t) => t.role === 'user').flatMap((t) => emailsInText(t.content)),
    ];
    const parsed = parseChatReply(res.content, shownItems.length, allowedAttendees);

    // Resolve a proposed action's item index to the REAL row id + title NOW
    // (the radar may reorder later; the proposal must stay pinned to what the
    // model actually meant). Stored on the message; nothing executes here.
    let storedAction: StoredChatAction | null = null;
    if (parsed.action) {
      const a = parsed.action;
      const idx = 'itemIndex' in a ? a.itemIndex : null;
      const item = typeof idx === 'number' ? shownItems[idx] : undefined;
      storedAction = {
        kind: a.kind,
        status: 'proposed',
        label: actionLabel(a, item?.title),
        tz,
        item_id: item?.id ?? null,
        item_title: item?.title ?? null,
        until_local: a.kind === 'snooze' ? a.untilLocal : null,
        task_title: a.kind === 'create_task' ? a.title : null,
        due_local: a.kind === 'create_task' ? a.dueLocal : null,
        instruction: a.kind === 'draft_reply' ? a.instruction : null,
        reminder_subject: a.kind === 'create_reminder' ? a.subject : null,
        to_email: a.kind === 'create_reminder' ? a.toEmail : null,
        first_at_local: a.kind === 'create_reminder' ? a.firstAtLocal : null,
        repeat_minutes: a.kind === 'create_reminder' ? a.repeatMinutes : null,
        send_count: a.kind === 'create_reminder' ? a.count : null,
        meeting_title: a.kind === 'create_meeting' ? a.title : null,
        start_local: a.kind === 'create_meeting' ? a.startLocal : null,
        duration_minutes: a.kind === 'create_meeting' ? a.durationMinutes : null,
        attendees: a.kind === 'create_meeting' ? a.attendees : null,
      };
    }

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
          action: storedAction,
          model: cfg.model,
          prompt_version: CHAT_PROMPT_VERSION,
        } as unknown as Json,
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

export type ExecuteChatActionResult =
  | { ok: true; result: string }
  | { ok: false; error: string };

/**
 * Run a CONFIRMED chat-order proposal — the manager tapped Confirm on the
 * action card. Re-validates the stored proposal (own message, still pending)
 * and executes through the same server actions the dashboard buttons use.
 * `edits.attendees` lets the meeting card's editable attendee list override
 * the proposal (validated here; the final list is persisted with the action).
 */
export async function executeChatAction(
  messageId: string,
  edits?: { attendees?: string[] },
): Promise<ExecuteChatActionResult> {
  await requireUser();
  const supabase = createClient();

  const { data: msg } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('id', messageId)
    .maybeSingle();
  if (!msg || msg.role !== 'assistant') return { ok: false, error: 'Action not found.' };
  const meta = (msg.metadata ?? {}) as Record<string, unknown>;
  const action = meta.action as StoredChatAction | null;
  if (!action || action.status !== 'proposed') {
    return { ok: false, error: 'This action is no longer pending.' };
  }

  // Apply card edits before executing (meeting attendees only, re-validated).
  if (action.kind === 'create_meeting' && edits?.attendees) {
    const clean: string[] = [];
    for (const raw of edits.attendees.slice(0, 10)) {
      const email = String(raw ?? '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        return { ok: false, error: `"${raw}" is not a valid email address.` };
      }
      if (!clean.includes(email)) clean.push(email);
    }
    action.attendees = clean;
  }

  const persist = async (status: StoredChatAction['status'], result: string | null) => {
    await supabase
      .from('chat_messages')
      .update({ metadata: { ...meta, action: { ...action, status, result } } as unknown as Json })
      .eq('id', messageId);
  };

  /** "YYYY-MM-DD HH:mm" in the manager's tz → UTC ISO (DST-safe). */
  const localToIso = (local: string) => {
    const [d, t] = local.split(' ');
    return zonedTimeToUtc(d, t, action.tz).toISOString();
  };

  let exec: { ok: boolean; error?: string } = { ok: false, error: 'Unknown action.' };
  let result = '';
  switch (action.kind) {
    case 'mark_done':
      if (!action.item_id) break;
      exec = await resolveWorkItem(action.item_id, 'done');
      result = `Done — "${action.item_title}" is marked complete.`;
      break;
    case 'snooze':
      if (!action.item_id || !action.until_local) break;
      exec = await snoozeWorkItem(action.item_id, localToIso(action.until_local));
      result = `Snoozed "${action.item_title}" until ${action.until_local} — it will resurface then.`;
      break;
    case 'create_task': {
      if (!action.task_title) break;
      const dueAt = action.due_local ? localToIso(action.due_local) : null;
      exec = await createManualTask(action.task_title, { title: action.task_title, dueAt });
      result = `Added "${action.task_title}" to your radar${action.due_local ? `, due ${action.due_local}` : ''}.`;
      break;
    }
    case 'draft_reply':
      if (!action.item_id) break;
      exec = await generateDraft(action.item_id, {
        instruction: action.instruction ?? undefined,
      });
      result = `Draft ready for "${action.item_title}" — review and approve it in Draft Replies. Nothing sends without you.`;
      break;
    case 'create_reminder': {
      if (!action.reminder_subject || !action.first_at_local) break;
      // Recipient defaults to the manager himself (profile email, falling
      // back to the connected mailbox address).
      let toEmail = action.to_email;
      if (!toEmail) {
        const [{ data: prof }, { data: mb }] = await Promise.all([
          supabase.from('profiles').select('email').eq('id', msg.user_id).maybeSingle(),
          supabase
            .from('mailboxes')
            .select('mailbox_email')
            .eq('status', 'active')
            .limit(1)
            .maybeSingle(),
        ]);
        toEmail = prof?.email ?? mb?.mailbox_email ?? null;
      }
      if (!toEmail) {
        exec = { ok: false, error: 'No recipient email found — connect a mailbox first.' };
        break;
      }
      const schedule = clampSchedule(action.repeat_minutes ?? null, action.send_count ?? 1);
      const { error } = await supabase.from('reminders').insert({
        user_id: msg.user_id,
        work_item_id: action.item_id,
        send_to_email: toEmail,
        title: action.reminder_subject,
        body: action.item_title
          ? `You asked Vesta to remind you about "${action.item_title}".`
          : null,
        remind_at: localToIso(action.first_at_local),
        timezone: action.tz,
        delivery_channels: ['email'],
        ...schedule,
        created_from: 'chat',
        metadata: { item_title: action.item_title } as Json,
      });
      exec = error ? { ok: false, error: error.message } : { ok: true };
      const times =
        schedule.repeat_every_minutes && schedule.remaining_sends > 1
          ? `${schedule.remaining_sends} emails, every ${schedule.repeat_every_minutes} min, starting`
          : 'one email at';
      result = `Reminder scheduled — ${times} ${action.first_at_local} to ${toEmail}. Manage it in Settings → Scheduled reminders.`;
      break;
    }
    case 'create_meeting': {
      if (!action.meeting_title || !action.start_local) break;
      const { data: mb } = await supabase
        .from('mailboxes')
        .select('integration_id')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      if (!mb?.integration_id) {
        exec = { ok: false, error: 'No connected Outlook mailbox — connect one in Settings.' };
        break;
      }
      if (!(await hasCalendarScope(mb.integration_id))) {
        exec = {
          ok: false,
          error:
            'Calendar access is not granted yet — open Settings and reconnect Outlook once, then ask me again.',
        };
        break;
      }
      const token = await getValidAccessToken(mb.integration_id);
      if (!token) {
        exec = { ok: false, error: 'Outlook token unavailable — try reconnecting in Settings.' };
        break;
      }
      const attendees = action.attendees ?? [];
      const durationMinutes = action.duration_minutes ?? 30;
      const startIso = localToIso(action.start_local);
      const endIso = new Date(new Date(startIso).getTime() + durationMinutes * 60_000).toISOString();
      try {
        const created = await createMeeting(token, {
          subject: action.meeting_title,
          startIso,
          endIso,
          attendees: attendees.map((email) => ({ email })),
          bodyText: 'Scheduled via Vesta — confirmed by the organizer.',
        });
        exec = { ok: true };
        const invitees =
          attendees.length > 0 ? `, invites sent to ${attendees.join(', ')}` : '';
        const link = created.onlineProvider ? ' (online-meeting link attached)' : '';
        result = `Meeting "${action.meeting_title}" is on your calendar — ${action.start_local}, ${durationMinutes} min${invitees}${link}.`;
      } catch {
        exec = {
          ok: false,
          error:
            'Outlook refused to create the meeting. If this mailbox was connected a while ago, reconnect it in Settings to grant calendar access.',
        };
      }
      break;
    }
  }

  if (!exec.ok) {
    const error = exec.error ?? 'The item this action points at is gone.';
    await persist('failed', error);
    return { ok: false, error };
  }
  await persist('done', result);
  return { ok: true, result };
}

/** Dismiss a pending chat-order proposal without running it. */
export async function cancelChatAction(
  messageId: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireUser();
  const supabase = createClient();
  const { data: msg } = await supabase
    .from('chat_messages')
    .select('id, role, metadata')
    .eq('id', messageId)
    .maybeSingle();
  if (!msg || msg.role !== 'assistant') return { ok: false, error: 'Action not found.' };
  const meta = (msg.metadata ?? {}) as Record<string, unknown>;
  const action = meta.action as StoredChatAction | null;
  if (!action || action.status !== 'proposed') return { ok: true }; // already settled
  const { error } = await supabase
    .from('chat_messages')
    .update({
      metadata: { ...meta, action: { ...action, status: 'cancelled', result: null } } as unknown as Json,
    })
    .eq('id', messageId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
