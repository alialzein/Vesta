import { describe, expect, it } from 'vitest';
import {
  buildChatPrompt,
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
