import { describe, expect, it } from 'vitest';
import { buildMeetingPrepPrompt, parseMeetingPrep } from '@/lib/ai/meeting-prep';

describe('buildMeetingPrepPrompt', () => {
  it('includes the meeting facts, the threads, the open items, and the grounding rules', () => {
    const { system, user } = buildMeetingPrepPrompt({
      subject: 'Q3 kickoff',
      whenLocal: 'Friday, June 13, 3:00 PM',
      organizer: 'Maya Khoury',
      attendees: ['maya@cedars.com', 'ali@vesta.app'],
      threads: [
        {
          subject: 'Budget numbers',
          from: 'Maya Khoury',
          date: '2026-06-10',
          preview: 'Revised numbers attached, need your sign-off.',
        },
      ],
      openItems: [{ title: 'Approve Q3 budget', category: 'decision', due: '2026-06-13' }],
      today: 'Friday, June 12, 2026',
    });
    expect(user).toContain('Q3 kickoff');
    expect(user).toContain('maya@cedars.com');
    expect(user).toContain('Budget numbers');
    expect(user).toContain('Approve Q3 budget');
    // Grounding: only the given context, no invention; honest empty state.
    expect(system).toContain('NEVER invent');
    expect(system).toContain('No recent email history');
  });

  it('says honestly when there is no context instead of omitting the sections', () => {
    const { user } = buildMeetingPrepPrompt({
      subject: 'Catch-up',
      whenLocal: 'Monday, 9:00 AM',
      organizer: null,
      attendees: [],
      threads: [],
      openItems: [],
      today: 'Friday, June 12, 2026',
    });
    expect(user).toContain('Recent email threads with these attendees: none.');
    expect(user).toContain('Open radar items tied to these people: none.');
  });
});

describe('parseMeetingPrep', () => {
  it('parses and clamps a well-formed prep', () => {
    const prep = parseMeetingPrep(
      JSON.stringify({
        keyPoints: ['Maya sent revised budget numbers on Jun 10.', '', '  spaced  '],
        openItems: ['Sign-off on the Q3 budget is still pending.'],
        questions: ['Does the revised number include the vendor change?'],
      }),
    );
    expect(prep.keyPoints).toEqual(['Maya sent revised budget numbers on Jun 10.', 'spaced']);
    expect(prep.openItems).toHaveLength(1);
    expect(prep.questions).toHaveLength(1);
  });

  it('caps each list (max 5 key points)', () => {
    const prep = parseMeetingPrep(
      JSON.stringify({ keyPoints: ['1', '2', '3', '4', '5', '6', '7'], openItems: [], questions: [] }),
    );
    expect(prep.keyPoints).toHaveLength(5);
  });

  it('drops non-string entries and throws when nothing usable remains', () => {
    expect(() =>
      parseMeetingPrep(JSON.stringify({ keyPoints: [42, null], openItems: [], questions: [] })),
    ).toThrow();
    expect(() => parseMeetingPrep('no json at all')).toThrow();
  });

  it('tolerates code fences', () => {
    const prep = parseMeetingPrep('```json\n{"keyPoints":["a"],"openItems":[],"questions":[]}\n```');
    expect(prep.keyPoints).toEqual(['a']);
  });
});
