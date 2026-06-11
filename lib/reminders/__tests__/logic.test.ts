import { describe, expect, it } from 'vitest';
import { afterSend, clampSchedule, reminderEmail, MAX_SENDS, MIN_REPEAT_MINUTES } from '@/lib/reminders/logic';

describe('afterSend', () => {
  const NOW = new Date('2026-06-12T15:02:00.000Z');

  it('one-shot completes after its only send', () => {
    const next = afterSend(
      { repeat_every_minutes: null, remaining_sends: 1, sent_count: 0, remind_at: '2026-06-12T15:00:00.000Z' },
      NOW,
    );
    expect(next.status).toBe('done');
    expect(next.remaining_sends).toBe(0);
    expect(next.sent_count).toBe(1);
  });

  it('recurring advances from the SCHEDULED time, not from now', () => {
    const next = afterSend(
      { repeat_every_minutes: 60, remaining_sends: 3, sent_count: 0, remind_at: '2026-06-12T15:00:00.000Z' },
      NOW,
    );
    expect(next.status).toBe('scheduled');
    expect(next.remaining_sends).toBe(2);
    expect(next.remind_at).toBe('2026-06-12T16:00:00.000Z'); // 15:00 + 1h, not 15:02 + 1h
  });

  it('catches up over downtime by skipping already-past slots', () => {
    const lateNow = new Date('2026-06-12T18:30:00.000Z'); // cron was down 3.5h
    const next = afterSend(
      { repeat_every_minutes: 60, remaining_sends: 5, sent_count: 1, remind_at: '2026-06-12T15:00:00.000Z' },
      lateNow,
    );
    expect(next.remind_at).toBe('2026-06-12T19:00:00.000Z'); // next FUTURE slot
  });

  it('the last send of a series completes it', () => {
    const next = afterSend(
      { repeat_every_minutes: 60, remaining_sends: 1, sent_count: 2, remind_at: '2026-06-12T17:00:00.000Z' },
      NOW,
    );
    expect(next.status).toBe('done');
    expect(next.sent_count).toBe(3);
  });
});

describe('clampSchedule', () => {
  it('clamps to the guard rails (min repeat, max sends)', () => {
    expect(clampSchedule(5, 100)).toEqual({
      repeat_every_minutes: MIN_REPEAT_MINUTES,
      remaining_sends: MAX_SENDS,
    });
    expect(clampSchedule(60, 3)).toEqual({ repeat_every_minutes: 60, remaining_sends: 3 });
  });

  it('a single send never repeats; no repeat means one shot', () => {
    expect(clampSchedule(60, 1)).toEqual({ repeat_every_minutes: null, remaining_sends: 1 });
    expect(clampSchedule(null, 3)).toEqual({ repeat_every_minutes: null, remaining_sends: 3 });
  });
});

describe('reminderEmail', () => {
  it('numbers the sends of a series and includes the thread', () => {
    const mail = reminderEmail({
      subject: 'Technical meeting timing',
      body: null,
      itemTitle: 'Zahraa - meeting timing',
      sentNumber: 2,
      totalSends: 3,
    });
    expect(mail.subject).toBe('Reminder (2/3): Technical meeting timing');
    expect(mail.html).toContain('Zahraa - meeting timing');
    expect(mail.html).toContain('Manage reminders in Settings');
  });

  it('one-shot has no counter and escapes HTML', () => {
    const mail = reminderEmail({
      subject: 'Call <Ahmad> & co',
      body: 'Say <hi>',
      sentNumber: 1,
      totalSends: 1,
    });
    expect(mail.subject).toBe('Reminder: Call <Ahmad> & co');
    expect(mail.html).toContain('Say &lt;hi&gt;');
    expect(mail.html).not.toContain('<hi>');
  });
});
