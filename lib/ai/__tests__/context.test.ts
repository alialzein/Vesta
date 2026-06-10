import { describe, expect, it } from 'vitest';
import { htmlToText, cleanForAi, bodyForAi, buildPrompt } from '@/lib/ai/context';

describe('htmlToText', () => {
  it('strips tags, scripts/styles, and decodes entities', () => {
    const html = '<style>p{color:red}</style><p>Hi&nbsp;Ali &amp; team</p><script>x()</script>';
    const out = htmlToText(html);
    expect(out).toContain('Hi Ali & team');
    expect(out).not.toMatch(/<|color:red|x\(\)/);
  });
});

describe('cleanForAi', () => {
  it('drops the quoted reply chain', () => {
    const t = 'Any update on the below?\nOn Mon, Jun 8 2026 at 1:27 PM Ali wrote:\nold stuff here';
    expect(cleanForAi(t)).toBe('Any update on the below?');
  });
  it('caps length', () => {
    expect(cleanForAi('a'.repeat(5000)).length).toBe(1800);
  });
});

describe('bodyForAi', () => {
  it('prefers plain text, falls back to html then preview', () => {
    expect(bodyForAi({ body_text: 'plain', body_html: '<p>html</p>' })).toBe('plain');
    expect(bodyForAi({ body_html: '<p>html</p>' })).toBe('html');
    expect(bodyForAi({ body_preview: 'prev' })).toBe('prev');
    expect(bodyForAi({})).toBe('');
  });
});

describe('buildPrompt', () => {
  it('includes the thread facts and the latest message', () => {
    const { system, user } = buildPrompt({
      subject: 'Q3 budget',
      latestMessage: 'Please approve by Friday.',
      senderName: 'Maya',
      messageCount: 3,
      followupCount: 2,
      isWaitingOnManager: true,
      latestAt: '2026-06-08T10:00:00Z',
    });
    expect(system).toMatch(/ONLY a JSON object/);
    // The category rules that drive the "Waiting on you" KPI.
    expect(system).toMatch(/never "followup"/);
    expect(system).toMatch(/decide by WHO is waiting/);
    expect(user).toContain('Subject: Q3 budget');
    expect(user).toContain('From: Maya');
    expect(user).toContain('Reminders the sender has sent: 2');
    expect(user).toContain('Please approve by Friday.');
  });

  it('includes today, and the both-direction conversation block when given', () => {
    const { user } = buildPrompt({
      subject: 'create new user',
      latestMessage: 'any update on the below?',
      senderName: 'Ali Alzein',
      messageCount: 3,
      followupCount: 1,
      isWaitingOnManager: false,
      latestAt: '2026-06-09T10:04:00Z',
      today: '2026-06-10',
      threadContext: [
        { from: 'Ali Alzein', body: 'please confirm to create the user: vesta' },
        { from: 'the manager', body: 'Confirmed, please let me know when done.' },
      ],
    });
    expect(user).toContain("Today's date: 2026-06-10");
    expect(user).toContain('Conversation so far (oldest first):');
    expect(user).toContain('- the manager: Confirmed, please let me know when done.');
  });

  it('omits the date/conversation lines when not provided (env without them)', () => {
    const { user } = buildPrompt({
      subject: 's',
      latestMessage: 'm',
      senderName: null,
      messageCount: 1,
      followupCount: 0,
      isWaitingOnManager: true,
      latestAt: null,
    });
    expect(user).not.toContain("Today's date");
    expect(user).not.toContain('Conversation so far');
  });
});
