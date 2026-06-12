import { describe, expect, it } from 'vitest';
import { applyMention, mentionQuery } from '@/lib/chat/mention';

describe('mentionQuery', () => {
  it('activates on a trailing @token of 2+ chars', () => {
    expect(mentionQuery('Schedule a meeting with @zah')).toEqual({ query: 'zah', start: 24 });
  });

  it('supports two-word names (full names keep matching)', () => {
    const q = mentionQuery('meet @zahraa daher');
    expect(q?.query).toBe('zahraa daher');
  });

  it('needs at least 2 chars and an @ preceded by start/space', () => {
    expect(mentionQuery('with @z')).toBeNull(); // too short
    expect(mentionQuery('no mention here')).toBeNull();
    // A typed email's @ is mid-word — never re-triggers the menu.
    expect(mentionQuery('invite zahraa@gmail.com')).toBeNull();
  });

  it('deactivates once the token is no longer at the end', () => {
    expect(mentionQuery('with zahraadaher17@gmail.com tomorrow')).toBeNull();
  });

  it('activates at the very start of the message', () => {
    expect(mentionQuery('@maya')).toEqual({ query: 'maya', start: 0 });
  });
});

describe('applyMention', () => {
  it('replaces the @token with the email plus a trailing space', () => {
    const value = 'Schedule a 30-minute meeting with @zah';
    const q = mentionQuery(value)!;
    expect(applyMention(value, q, 'zahraadaher17@gmail.com')).toBe(
      'Schedule a 30-minute meeting with zahraadaher17@gmail.com ',
    );
  });

  it('the result does not re-trigger the menu', () => {
    const value = 'meet @maya';
    const next = applyMention(value, mentionQuery(value)!, 'maya@cedars.com');
    expect(mentionQuery(next)).toBeNull();
  });
});
