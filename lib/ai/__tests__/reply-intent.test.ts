import { describe, expect, it } from 'vitest';
import { buildReplyIntentPrompt, parseReplyIntent } from '@/lib/ai/reply-intent';

describe('parseReplyIntent', () => {
  it('reads a confirmed reply-intent object', () => {
    const r = parseReplyIntent(
      '{"expectsReply": true, "summary": "Asked Maya for figures", "nextAction": "Ping Maya Thu", "reason": "Budget is blocked"}',
    );
    expect(r.expectsReply).toBe(true);
    expect(r.summary).toBe('Asked Maya for figures');
    expect(r.nextAction).toBe('Ping Maya Thu');
  });

  it('reads a not-expecting reply object', () => {
    const r = parseReplyIntent('{"expectsReply": false, "reason": "Just a thank-you"}');
    expect(r.expectsReply).toBe(false);
    // Falls back to safe defaults for the empty text fields.
    expect(r.summary.length).toBeGreaterThan(0);
    expect(r.nextAction.length).toBeGreaterThan(0);
  });

  it('tolerates code fences / preamble around the JSON', () => {
    const r = parseReplyIntent('Sure:\n```json\n{"expectsReply": true}\n```');
    expect(r.expectsReply).toBe(true);
  });

  it('treats a string "true" as true and anything else as false', () => {
    expect(parseReplyIntent('{"expectsReply":"true"}').expectsReply).toBe(true);
    expect(parseReplyIntent('{"expectsReply":"maybe"}').expectsReply).toBe(false);
    expect(parseReplyIntent('{}').expectsReply).toBe(false);
  });

  it('throws when there is no JSON object', () => {
    expect(() => parseReplyIntent('no json here')).toThrow();
  });
});

describe('buildReplyIntentPrompt', () => {
  it('includes the reply text and recipient, and asks for JSON only', () => {
    const { system, user } = buildReplyIntentPrompt({
      subject: 'Budget',
      recipientName: 'Maya',
      reply: 'Can you send the final numbers?',
    });
    expect(user).toContain('Can you send the final numbers?');
    expect(user).toContain('Maya');
    expect(system).toMatch(/expectsReply/);
    expect(system).toMatch(/ONLY a JSON object/i);
  });
});
