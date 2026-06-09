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
});
