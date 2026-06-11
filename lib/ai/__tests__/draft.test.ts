import { describe, expect, it } from 'vitest';
import { buildDraftPrompt, parseDraft } from '@/lib/ai/draft';

describe('parseDraft', () => {
  it('reads a well-formed draft object', () => {
    const d = parseDraft(
      '{"subject":"RE: Budget","body_text":"Hi Maya,\\n\\nApproved — go ahead.\\n\\nAli","tone":"warm","warnings":[],"requires_human_review":false}',
      'RE: Budget',
    );
    expect(d.subject).toBe('RE: Budget');
    expect(d.bodyText).toContain('Approved');
    expect(d.tone).toBe('warm');
    expect(d.warnings).toEqual([]);
    expect(d.requiresHumanReview).toBe(false);
  });

  it('coerces an unknown tone to professional and caps warnings', () => {
    const d = parseDraft(
      '{"body_text":"ok","tone":"sarcastic","warnings":["a","b","c","d","e","f"]}',
      null,
    );
    expect(d.tone).toBe('professional');
    expect(d.warnings).toHaveLength(5);
  });

  it('treats string "true" as requiring review', () => {
    const d = parseDraft('{"body_text":"x","requires_human_review":"true"}', null);
    expect(d.requiresHumanReview).toBe(true);
  });

  it('falls back to the provided subject when the model omits one', () => {
    const d = parseDraft('{"body_text":"hello"}', 'RE: Project');
    expect(d.subject).toBe('RE: Project');
  });

  it('tolerates code fences / preamble around the JSON', () => {
    const d = parseDraft('Sure:\n```json\n{"body_text":"hi"}\n```', null);
    expect(d.bodyText).toBe('hi');
  });

  it('throws when the body is empty or there is no JSON', () => {
    expect(() => parseDraft('{"body_text":""}', null)).toThrow();
    expect(() => parseDraft('no json', null)).toThrow();
  });
});

describe('buildDraftPrompt', () => {
  it('includes the message, recipient, sign-off, tone, and asks for JSON only', () => {
    const { system, user } = buildDraftPrompt({
      subject: 'Q3 budget',
      recipientName: 'Maya',
      managerName: 'Ali',
      latestMessage: 'Can you approve the Q3 budget?',
      tone: 'concise',
    });
    expect(user).toContain('Can you approve the Q3 budget?');
    expect(user).toContain('Maya');
    expect(user).toContain('Ali');
    expect(user).toContain('concise');
    expect(system).toMatch(/ONLY a JSON object/i);
    expect(system).toMatch(/Never invent facts/i);
  });

  it('passes the manager tone notes and a per-reply instruction when given', () => {
    const { user } = buildDraftPrompt({
      subject: null,
      recipientName: null,
      managerName: null,
      latestMessage: 'hi',
      tone: 'professional',
      toneNotes: ['warm but brief', 'no exclamation marks'],
      instruction: 'Politely decline.',
    });
    expect(user).toContain('warm but brief');
    expect(user).toContain('no exclamation marks');
    expect(user).toContain('Politely decline.');
  });

  it('carries hard rules into the system prompt and context notes into the user prompt (Phase 10)', () => {
    const { system, user } = buildDraftPrompt({
      subject: 'Delivery date',
      recipientName: 'Maya',
      managerName: 'Ali',
      latestMessage: 'Can you deliver by Monday?',
      tone: 'professional',
      hardRules: ['Never promise same-day delivery.'],
      contextNotes: ['Cedars Group is our key client.'],
    });
    expect(system).toContain("The manager's hard rules");
    expect(system).toContain('- Never promise same-day delivery.');
    expect(user).toContain('Background the manager has saved (use only when relevant):');
    expect(user).toContain('- Cedars Group is our key client.');
  });

  it('omits the memory blocks when none are given', () => {
    const { system, user } = buildDraftPrompt({
      subject: null,
      recipientName: null,
      managerName: null,
      latestMessage: 'hi',
      tone: 'professional',
    });
    expect(system).not.toContain('hard rules');
    expect(user).not.toContain('Background the manager has saved');
  });

  it('defaults to a reply (the manager owes the answer)', () => {
    const { system } = buildDraftPrompt({
      subject: 'Q3 budget',
      recipientName: 'Maya',
      managerName: 'Ali',
      latestMessage: 'Can you approve the Q3 budget?',
      tone: 'professional',
    });
    expect(system).toMatch(/ready-to-send reply/i);
    expect(system).not.toMatch(/WAITING ON the recipient/);
  });

  it('writes a follow-up nudge (not a reply) for waiting_on_them items', () => {
    const { system, user } = buildDraftPrompt({
      subject: 'create new user',
      recipientName: 'Ali Alzein',
      managerName: 'Vesta Dev',
      latestMessage: 'any update on the below? we need it the soonest',
      tone: 'professional',
      purpose: 'follow_up',
      threadContext: [
        { from: 'Ali Alzein', body: 'please confirm to create below user: vesta' },
        { from: 'the manager', body: 'Confirmed, please let me know when done.' },
      ],
    });
    // The instruction flips direction: nudge them for what they owe.
    expect(system).toMatch(/WAITING ON the recipient/);
    expect(system).toMatch(/Do NOT write as if the manager owes a reply/);
    // The model sees the manager's own reply, so it can't mistake who answered.
    expect(user).toContain('Conversation so far (oldest first):');
    expect(user).toContain('the manager: Confirmed, please let me know when done.');
    expect(user).toMatch(/recipient's last message/);
  });

  it('includes the thread context for plain replies too', () => {
    const { user } = buildDraftPrompt({
      subject: 'Q3 budget',
      recipientName: 'Maya',
      managerName: 'Ali',
      latestMessage: 'Can you approve the Q3 budget?',
      tone: 'professional',
      threadContext: [{ from: 'Maya', body: 'Sending the Q3 budget for approval.' }],
    });
    expect(user).toContain('Conversation so far (oldest first):');
    expect(user).toContain('- Maya: Sending the Q3 budget for approval.');
    expect(user).toContain('Latest message to reply to:');
  });

  it('is time-aware (draft-v4): today, the message age, and per-message dates are in the prompt', () => {
    const { system, user } = buildDraftPrompt({
      subject: 'Techinal Meeting',
      recipientName: 'Zahraa Daher',
      managerName: 'Vesta Dev',
      latestMessage: 'Should the technical meeting happen today or tomorrow?',
      tone: 'professional',
      today: 'Thursday, June 11, 2026',
      receivedAt: 'Tue, Jun 9, 8:39 PM UTC (2 days ago)',
      threadContext: [
        { from: 'Zahraa Daher', at: 'Jun 9', body: 'Should the meeting happen today or tomorrow?' },
      ],
    });
    // The rule that stops "happy to do today or tomorrow" replies to stale mail.
    expect(system).toContain('TIME AWARENESS');
    expect(system).toMatch(/Never accept, confirm, or propose a time that has already passed/);
    expect(user).toContain('Today is Thursday, June 11, 2026.');
    expect(user).toContain('(received Tue, Jun 9, 8:39 PM UTC (2 days ago)):');
    expect(user).toContain('- [Jun 9] Zahraa Daher:');
  });

  it('omits the date lines when not provided (older callers stay valid)', () => {
    const { user } = buildDraftPrompt({
      subject: null,
      recipientName: null,
      managerName: null,
      latestMessage: 'hi',
      tone: 'professional',
    });
    expect(user).not.toContain('Today is');
    expect(user).toContain('Latest message to reply to:');
  });
});
