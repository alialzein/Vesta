import { describe, expect, it } from 'vitest';
import {
  actionLabel,
  buildChatPrompt,
  emailsInText,
  isDuplicateMemory,
  parseChatReply,
  titleFromMessage,
  type ChatContext,
} from '@/lib/ai/chat';

function makeContext(over: Partial<ChatContext> = {}): ChatContext {
  return {
    managerName: 'Ali',
    role: 'Managing Director',
    timezone: 'Asia/Dubai',
    now: 'Thursday, June 11, 2026, 2:30 PM',
    memories: [
      { type: 'vip', text: 'Maya from Cedars Group is a VIP client.' },
      { type: 'preference', text: 'Prefers short, direct emails.' },
    ],
    rules: [{ name: 'Never auto-send', description: 'Drafts always need approval' }],
    workCounts: { open: 7, waiting: 3, drafts: 2 },
    workItems: [
      {
        title: 'Cedars contract approval',
        category: 'decision',
        priority: 92,
        dueAt: '2026-06-12T09:00:00Z',
        summary: 'Maya needs sign-off on the renewal terms.',
        reason: 'Maya is waiting on your approval.',
        suggestedAction: 'Review clause 4 and reply.',
      },
    ],
    briefingHeadlines: ['New AI data regulation announced in the UAE'],
    dailyBrief: 'Busy morning: 3 people waiting, Cedars approval is the big one.',
    calendarEnabled: true,
    meetings: ['09:30–10:00 Standup — organizer Maya, 4 attendees, online meeting'],
    people: [{ name: 'Maya Chen', email: 'maya@cedars.com' }],
    ...over,
  };
}

describe('buildChatPrompt', () => {
  it('grounds the model in the manager identity, time, memories, rules, work, and briefing', () => {
    const { system, user } = buildChatPrompt({
      context: makeContext(),
      history: [],
      message: 'What should I focus on?',
    });
    expect(system).toContain("Ali's chief of staff");
    expect(system).toContain('Return ONLY a JSON object');
    expect(system).toContain('"remember"');
    // The "Noted" bug (owner-reported): the model must not imply it saved
    // anything on turns where remember is empty.
    expect(system).toContain('When "remember" is empty, never say "Noted"');
    expect(user).toContain('Asia/Dubai');
    expect(user).toContain('Maya from Cedars Group is a VIP client.');
    expect(user).toContain('Never auto-send');
    expect(user).toContain('Cedars contract approval');
    expect(user).toContain('3 waiting on Ali');
    expect(user).toContain('New AI data regulation announced in the UAE');
    expect(user).toContain("Today's inbox brief");
    expect(user).toContain('Ali says:');
    expect(user).toContain('What should I focus on?');
  });

  it('lists work items with actionable [index] handles and the order rules', () => {
    const { system, user } = buildChatPrompt({
      context: makeContext(),
      history: [],
      message: 'Mark the Cedars item done',
    });
    expect(user).toContain('[0] "Cedars contract approval"');
    expect(system).toContain('How to act (the "action" field)');
    expect(system).toContain('You only PROPOSE');
    expect(system).toContain('One action per turn');
  });

  it('tells the model to pay attention when there are no memories yet', () => {
    const { user } = buildChatPrompt({
      context: makeContext({ memories: [] }),
      history: [],
      message: 'Hi',
    });
    expect(user).toContain('no standing memories');
  });

  it('includes recent history with the manager name, capped at 20 turns', () => {
    const history = Array.from({ length: 25 }, (_, i) => ({
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `turn ${i}`,
    }));
    const { user } = buildChatPrompt({ context: makeContext(), history, message: 'next' });
    expect(user).not.toContain('turn 4'); // beyond the cap
    expect(user).toContain('turn 5');
    expect(user).toContain('turn 24');
    expect(user).toContain('Ali: turn 6');
    expect(user).toContain('Vesta: turn 5');
  });
});

describe('parseChatReply', () => {
  it('parses a reply with validated remember entries', () => {
    const parsed = parseChatReply(
      JSON.stringify({
        reply: 'Focus on Cedars first.',
        remember: [
          { type: 'personal', text: "Ali's daughter Lina has a recital every Thursday." },
          { type: 'not_a_type', text: 'should be dropped' },
          { type: 'preference', text: 'short' }, // too short to be durable
          { type: 'vip', text: 'Treat Rania in Finance as a VIP.' },
        ],
      }),
    );
    expect(parsed.reply).toBe('Focus on Cedars first.');
    expect(parsed.remember).toEqual([
      { type: 'personal', text: "Ali's daughter Lina has a recital every Thursday." },
      { type: 'vip', text: 'Treat Rania in Finance as a VIP.' },
    ]);
  });

  it('caps remember at 3 and dedupes identical facts', () => {
    const entry = { type: 'preference', text: 'Wants meetings before noon only.' };
    const parsed = parseChatReply(
      JSON.stringify({
        reply: 'Noted.',
        remember: [
          entry,
          entry,
          { type: 'personal', text: 'Supports Liverpool FC since childhood.' },
          { type: 'tone', text: 'Likes a warm but brief opening line.' },
          { type: 'vip', text: 'A fifth fact that must be cut by the cap.' },
        ],
      }),
    );
    expect(parsed.remember).toHaveLength(3);
  });

  it('handles a reply with no remember field and rejects an empty reply', () => {
    expect(parseChatReply('{"reply":"Just an answer."}').remember).toEqual([]);
    expect(() => parseChatReply('{"reply":""}')).toThrow();
    expect(() => parseChatReply('total garbage')).toThrow();
  });

  it('survives code fences around the JSON', () => {
    const parsed = parseChatReply('```json\n{"reply":"Hello Ali."}\n```');
    expect(parsed.reply).toBe('Hello Ali.');
  });
});

describe('parseChatReply — actions', () => {
  const wrap = (action: unknown) => JSON.stringify({ reply: 'Proposing.', action });

  it('accepts each valid action kind', () => {
    expect(parseChatReply(wrap({ kind: 'mark_done', itemIndex: 1 }), 3).action).toEqual({
      kind: 'mark_done',
      itemIndex: 1,
    });
    expect(
      parseChatReply(wrap({ kind: 'snooze', itemIndex: 0, untilLocal: '2026-06-15 09:00' }), 3)
        .action,
    ).toEqual({ kind: 'snooze', itemIndex: 0, untilLocal: '2026-06-15 09:00' });
    expect(
      parseChatReply(wrap({ kind: 'create_task', title: 'Call Ahmad', dueLocal: '2026-06-12 15:00' }), 0)
        .action,
    ).toEqual({ kind: 'create_task', title: 'Call Ahmad', dueLocal: '2026-06-12 15:00' });
    expect(
      parseChatReply(wrap({ kind: 'draft_reply', itemIndex: 2, instruction: 'Say I can meet Thursday 2pm' }), 3)
        .action,
    ).toEqual({ kind: 'draft_reply', itemIndex: 2, instruction: 'Say I can meet Thursday 2pm' });
  });

  it('drops out-of-range indexes, bad times, and unknown kinds (reply survives)', () => {
    expect(parseChatReply(wrap({ kind: 'mark_done', itemIndex: 5 }), 3).action).toBeNull();
    expect(parseChatReply(wrap({ kind: 'mark_done', itemIndex: 0 }), 0).action).toBeNull();
    expect(
      parseChatReply(wrap({ kind: 'snooze', itemIndex: 0, untilLocal: 'tomorrow 9am' }), 3).action,
    ).toBeNull();
    expect(parseChatReply(wrap({ kind: 'delete_everything', itemIndex: 0 }), 3).action).toBeNull();
    expect(parseChatReply(wrap('not an object'), 3).action).toBeNull();
    expect(parseChatReply('{"reply":"No order here."}', 3).action).toBeNull();
  });

  it('create_task with an unparseable due time keeps the task, drops the time', () => {
    const parsed = parseChatReply(
      wrap({ kind: 'create_task', title: 'Call Ahmad', dueLocal: 'sometime' }),
      0,
    );
    expect(parsed.action).toEqual({ kind: 'create_task', title: 'Call Ahmad', dueLocal: null });
  });

  it('accepts a recurring email reminder (hourly × 3) and clamps abuse', () => {
    expect(
      parseChatReply(
        wrap({
          kind: 'create_reminder',
          itemIndex: 0,
          subject: 'Technical meeting timing',
          toEmail: null,
          firstAtLocal: '2026-06-12 15:00',
          repeatMinutes: 60,
          count: 3,
        }),
        3,
      ).action,
    ).toEqual({
      kind: 'create_reminder',
      itemIndex: 0,
      subject: 'Technical meeting timing',
      toEmail: null,
      firstAtLocal: '2026-06-12 15:00',
      repeatMinutes: 60,
      count: 3,
    });

    // 5-minute spam → floor of 15; count 99 → cap 10; bad email → null (self).
    const clamped = parseChatReply(
      wrap({
        kind: 'create_reminder',
        itemIndex: null,
        subject: 'Ping me',
        toEmail: 'not-an-email',
        firstAtLocal: '2026-06-12 15:00',
        repeatMinutes: 5,
        count: 99,
      }),
      0,
    ).action;
    expect(clamped).toMatchObject({ repeatMinutes: 15, count: 10, toEmail: null, itemIndex: null });
  });

  it('reminder without a valid first time is dropped; single send never repeats', () => {
    expect(
      parseChatReply(
        wrap({ kind: 'create_reminder', subject: 'Ping', toEmail: null, firstAtLocal: '3pm', count: 1 }),
        0,
      ).action,
    ).toBeNull();
    const single = parseChatReply(
      wrap({
        kind: 'create_reminder',
        subject: 'Ping once',
        toEmail: 'zahraa@example.com',
        firstAtLocal: '2026-06-12 15:00',
        repeatMinutes: 60,
        count: 1,
      }),
      0,
    ).action;
    expect(single).toMatchObject({ repeatMinutes: null, count: 1, toEmail: 'zahraa@example.com' });
  });

  it('create_meeting (Phase C): valid proposal with allowed attendees', () => {
    const action = parseChatReply(
      wrap({
        kind: 'create_meeting',
        title: 'Project sync',
        startLocal: '2026-06-13 15:00',
        durationMinutes: 45,
        attendees: ['Maya@Cedars.com'],
      }),
      0,
      ['maya@cedars.com'],
    ).action;
    expect(action).toEqual({
      kind: 'create_meeting',
      title: 'Project sync',
      startLocal: '2026-06-13 15:00',
      durationMinutes: 45,
      attendees: ['maya@cedars.com'],
    });
  });

  it('create_meeting: an INVENTED attendee email kills the whole proposal', () => {
    expect(
      parseChatReply(
        wrap({
          kind: 'create_meeting',
          title: 'Project sync',
          startLocal: '2026-06-13 15:00',
          durationMinutes: 30,
          attendees: ['maya@cedars.com', 'guessed@nowhere.com'],
        }),
        0,
        ['maya@cedars.com'],
      ).action,
    ).toBeNull();
  });

  it('create_meeting: duration clamps 15–480 (default 30); bad start time drops it', () => {
    const a = parseChatReply(
      wrap({ kind: 'create_meeting', title: 'Block', startLocal: '2026-06-13 09:00', durationMinutes: 5, attendees: [] }),
      0,
    ).action;
    expect(a).toMatchObject({ durationMinutes: 15, attendees: [] });
    const noDur = parseChatReply(
      wrap({ kind: 'create_meeting', title: 'Block', startLocal: '2026-06-13 09:00', attendees: [] }),
      0,
    ).action;
    expect(noDur).toMatchObject({ durationMinutes: 30 });
    expect(
      parseChatReply(
        wrap({ kind: 'create_meeting', title: 'Block', startLocal: 'Friday 3pm', attendees: [] }),
        0,
      ).action,
    ).toBeNull();
  });
});

describe('emailsInText', () => {
  it('finds every typed email, lowercased', () => {
    expect(emailsInText('invite Maya@Cedars.com and sam@x.io please')).toEqual([
      'maya@cedars.com',
      'sam@x.io',
    ]);
    expect(emailsInText('no emails here')).toEqual([]);
  });
});

describe('actionLabel', () => {
  it('describes each kind with the real item title', () => {
    expect(actionLabel({ kind: 'mark_done', itemIndex: 0 }, 'Cedars contract')).toBe(
      'Mark "Cedars contract" as done',
    );
    expect(
      actionLabel({ kind: 'snooze', itemIndex: 0, untilLocal: '2026-06-15 09:00' }, 'Cedars contract'),
    ).toContain('until 2026-06-15 09:00');
    expect(actionLabel({ kind: 'create_task', title: 'Call Ahmad', dueLocal: null })).toBe(
      'Add task "Call Ahmad"',
    );
    expect(
      actionLabel({ kind: 'draft_reply', itemIndex: 0, instruction: 'x' }, 'Cedars contract'),
    ).toContain('for your approval');
    expect(
      actionLabel({
        kind: 'create_reminder',
        itemIndex: 0,
        subject: 'Meeting timing',
        toEmail: null,
        firstAtLocal: '2026-06-12 15:00',
        repeatMinutes: 60,
        count: 3,
      }),
    ).toBe('Email reminder to you about "Meeting timing" starting 2026-06-12 15:00, hourly × 3');
    expect(
      actionLabel({
        kind: 'create_meeting',
        title: 'Project sync',
        startLocal: '2026-06-13 15:00',
        durationMinutes: 45,
        attendees: ['maya@cedars.com'],
      }),
    ).toBe('Schedule meeting "Project sync" with maya@cedars.com — 2026-06-13 15:00, 45 min');
  });
});

describe('buildChatPrompt — calendar (Phase C)', () => {
  it('shows today\'s meetings + the known-people list when calendar is enabled', () => {
    const { system, user } = buildChatPrompt({
      context: makeContext(),
      history: [],
      message: 'What meetings do I have today?',
    });
    expect(user).toContain("Today's calendar");
    expect(user).toContain('Standup');
    expect(user).toContain('<maya@cedars.com>');
    expect(system).toContain('create_meeting');
    expect(system).not.toContain('Calendar access is NOT granted');
  });

  it('tells the model to point at Reconnect when calendar is not granted', () => {
    const { system, user } = buildChatPrompt({
      context: makeContext({ calendarEnabled: false, meetings: [] }),
      history: [],
      message: 'Schedule a meeting with Maya',
    });
    expect(system).toContain('Calendar access is NOT granted');
    expect(user).not.toContain("Today's calendar");
  });
});

describe('titleFromMessage', () => {
  it('uses the message, collapsed and capped at 60 chars', () => {
    expect(titleFromMessage('What should   I focus on?')).toBe('What should I focus on?');
    expect(titleFromMessage('x'.repeat(100))).toHaveLength(60);
    expect(titleFromMessage('   ')).toBe('New conversation');
  });
});

describe('isDuplicateMemory', () => {
  const existing = ['Prefers short, direct emails.', 'Maya from Cedars Group is a VIP client'];
  it('catches exact and near matches regardless of case/punctuation', () => {
    expect(isDuplicateMemory('prefers short direct emails', existing)).toBe(true);
    expect(isDuplicateMemory('Maya from Cedars Group is a VIP client.', existing)).toBe(true);
  });
  it('catches containment either way', () => {
    expect(isDuplicateMemory('Maya from Cedars Group is a VIP', existing)).toBe(true);
  });
  it('lets genuinely new facts through', () => {
    expect(isDuplicateMemory('Daughter Lina has a recital on Thursdays.', existing)).toBe(false);
  });
});
