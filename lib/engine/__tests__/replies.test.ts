import { describe, expect, it } from 'vitest';
import {
  replyLikelyExpectsResponse,
  replyPlausiblyExpectsResponse,
} from '@/lib/engine/replies';

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

describe('replyPlausiblyExpectsResponse (permissive pre-gate)', () => {
  it.each([
    'Can you send me the Q3 figures?', // a clear ask
    'I have updated the document on the shared drive.', // plain statement — AI decides
    'The vendor situation is still unresolved on our side.', // unusual ask, no "?"/verb
    'Looping you in on this one.',
  ])('keeps anything that is not a clear closing note: %s', (t) => {
    expect(replyPlausiblyExpectsResponse(t)).toBe(true);
  });

  it.each(['Thanks!', 'Got it.', 'Will do.', 'Noted', 'Done.', '', '   '])(
    'still drops a clear single-token closing note: %s',
    (t) => {
      expect(replyPlausiblyExpectsResponse(t)).toBe(false);
    },
  );

  it('is strictly more permissive than the strict gate on a plain statement', () => {
    const plain = 'I have updated the document on the shared drive.';
    expect(replyLikelyExpectsResponse(plain)).toBe(false); // strict drops it
    expect(replyPlausiblyExpectsResponse(plain)).toBe(true); // permissive keeps it
  });

  it('handles null/undefined', () => {
    expect(replyPlausiblyExpectsResponse(null)).toBe(false);
    expect(replyPlausiblyExpectsResponse(undefined)).toBe(false);
  });
});
