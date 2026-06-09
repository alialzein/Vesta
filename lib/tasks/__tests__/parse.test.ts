import { describe, expect, it } from 'vitest';
import { parseQuickTask } from '@/lib/tasks/parse';

// Fixed reference point: Wednesday, 10 June 2026, 08:00 local time. Assertions read
// LOCAL date/time fields off the parsed Date so they hold regardless of the test
// machine's timezone (the parser resolves times in the viewer's local zone).
const NOW = new Date(2026, 5, 10, 8, 0, 0);
const parse = (s: string) => parseQuickTask(s, NOW);
const due = (s: string) => {
  const iso = parse(s).dueAt;
  return iso ? new Date(iso) : null;
};

describe('parseQuickTask — title extraction', () => {
  it('strips the date/time words from the title', () => {
    expect(parse('Call the vendor tomorrow 3pm').title).toBe('Call the vendor');
  });

  it('strips a "remind me to" prefix', () => {
    expect(parse('remind me to email Maya today').title).toBe('email Maya');
  });

  it('keeps the whole text when there is no date', () => {
    const r = parse('Draft the Q3 board update');
    expect(r.title).toBe('Draft the Q3 board update');
    expect(r.dueAt).toBeNull();
  });

  it('falls back to the original text if stripping would empty the title', () => {
    expect(parse('tomorrow').title.length).toBeGreaterThan(0);
  });
});

describe('parseQuickTask — relative dates', () => {
  it('tomorrow + explicit time', () => {
    const d = due('Call the vendor tomorrow 3pm')!;
    expect(d.getDate()).toBe(11);
    expect(d.getHours()).toBe(15);
    expect(d.getMinutes()).toBe(0);
  });

  it('today defaults to 9am', () => {
    const d = due('email Maya today')!;
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(9);
  });

  it('tonight defaults to the evening', () => {
    const d = due('ship the deck tonight')!;
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(19);
  });

  it('next week is +7 days', () => {
    const d = due('Submit report next week')!;
    expect(d.getDate()).toBe(17);
    expect(d.getHours()).toBe(9);
  });

  it('in N days', () => {
    const d = due('Pay invoice in 3 days')!;
    expect(d.getDate()).toBe(13);
  });

  it('a weekday resolves to its next occurrence', () => {
    // Wed 10 June → the coming Friday is 12 June.
    const d = due('Meet John friday')!;
    expect(d.getDate()).toBe(12);
    expect(d.getHours()).toBe(9);
    expect(parse('Meet John friday').title).toBe('Meet John');
  });
});

describe('parseQuickTask — time only', () => {
  it('a future time today stays today', () => {
    const d = due('Standup at 9am')!; // now is 8am
    expect(d.getDate()).toBe(10);
    expect(d.getHours()).toBe(9);
    expect(parse('Standup at 9am').title).toBe('Standup');
  });

  it('a time already passed rolls to tomorrow', () => {
    const d = due('Review PR at 7am')!; // now is 8am
    expect(d.getDate()).toBe(11);
    expect(d.getHours()).toBe(7);
  });
});
