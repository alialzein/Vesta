import { describe, expect, it } from 'vitest';
import { replyLikelyExpectsResponse } from '@/lib/engine/replies';

describe('replyLikelyExpectsResponse', () => {
  it.each([
    'Can you send me the Q3 figures?',
    'Please confirm the budget by Friday.',
    'Could you review the attached draft?',
    'Let me know what you think.',
    'When will the report be ready?',
    'I am still waiting for your sign-off.',
    'Please share the deck with me.',
  ])('keeps a reply that asks for something: %s', (text) => {
    expect(replyLikelyExpectsResponse(text)).toBe(true);
  });

  it.each([
    'Thanks!',
    'Got it.',
    'Will do.',
    'Sounds good',
    'Perfect, done.',
    'Noted, cheers.',
    '',
    '   ',
  ])('drops a closing reply that expects nothing: %s', (text) => {
    expect(replyLikelyExpectsResponse(text)).toBe(false);
  });

  it('drops a plain statement with no ask', () => {
    expect(replyLikelyExpectsResponse('I have updated the document on the shared drive.')).toBe(
      false,
    );
  });

  it('handles null/undefined', () => {
    expect(replyLikelyExpectsResponse(null)).toBe(false);
    expect(replyLikelyExpectsResponse(undefined)).toBe(false);
  });
});
