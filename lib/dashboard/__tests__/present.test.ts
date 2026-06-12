import { describe, expect, it } from 'vitest';
import {
  chipsFor,
  cleanPreview,
  dueOf,
  personFrom,
  senderDisplay,
} from '@/lib/dashboard/present';

describe('senderDisplay', () => {
  it('prefers the stored display name', () => {
    expect(senderDisplay('Maya Khoury', 'maya.khoury@cedars.com')).toBe('Maya Khoury');
  });

  it('humanizes the email local part when the name is missing', () => {
    expect(senderDisplay(null, 'rania.haddad@vesta.app')).toBe('Rania Haddad');
    expect(senderDisplay('', 'it-support@vesta.app')).toBe('It Support');
  });

  it('falls back to the local part when the name is just the address', () => {
    expect(senderDisplay('noreply@vendor.com', 'noreply@vendor.com')).toBe('Noreply');
  });

  it('returns undefined when nothing is known', () => {
    expect(senderDisplay(null, null)).toBeUndefined();
    expect(senderDisplay(undefined, undefined)).toBeUndefined();
  });
});

describe('personFrom (AI-sentence fallback)', () => {
  it('extracts the leading name from "X is waiting"', () => {
    expect(personFrom('Maya is waiting on your approval.')).toBe('Maya');
  });

  it('extracts from "Waiting on X to reply"', () => {
    expect(personFrom('Waiting on Rania to reply about the payment.')).toBe('Rania');
  });

  it('returns undefined for sentences with no counterpart', () => {
    expect(personFrom('This deadline appears to be today.')).toBeUndefined();
    expect(personFrom(null)).toBeUndefined();
  });
});

describe('dueOf', () => {
  const now = new Date('2026-06-10T12:00:00Z');

  it('flags a past due_at as Overdue with the original date AND time as detail', () => {
    const due = dueOf('2026-06-09T16:00:00Z', 'waiting', 'UTC', now);
    expect(due.overdue).toBe(true);
    expect(due.label).toBe('Overdue');
    // "was due Jun 9, 04:00 PM" — the time matters: a 3 PM deadline is only
    // overdue after 3 PM, and the manager must see which moment was missed.
    expect(due.detail).toMatch(/was due Jun 9, .*4:00/);
  });

  it('is NOT overdue before the due moment on the same day', () => {
    // Due today 16:00 UTC, now is 12:00 UTC — still ahead.
    const due = dueOf('2026-06-10T16:00:00Z', 'waiting', 'UTC', now);
    expect(due.overdue).toBe(false);
    expect(due.label).toMatch(/^Due /);
  });

  it('renders the label in the MANAGER timezone, not the server one', () => {
    // 23:30 UTC on Jun 12 is already Jun 13, 02:30 in Beirut (+03).
    const due = dueOf('2026-06-12T23:30:00Z', 'waiting', 'Asia/Beirut', now);
    expect(due.label).toBe('Due Jun 13');
    expect(due.detail).toMatch(/2:30/);
  });

  it('keeps a future due_at as a neutral "Due …" label', () => {
    const due = dueOf('2026-06-12T16:00:00Z', 'waiting', 'UTC', now);
    expect(due.overdue).toBe(false);
    expect(due.label).toMatch(/^Due /);
  });

  it('uses the category wording when there is no due date', () => {
    expect(dueOf(null, 'waiting', 'UTC', now)).toEqual({ label: 'Waiting on you', overdue: false });
    expect(dueOf(null, 'fyi', 'UTC', now)).toEqual({ label: 'In your queue', overdue: false });
  });
});

describe('chipsFor', () => {
  it('returns exactly one category chip — no "High priority" companion (the badge color says it)', () => {
    expect(chipsFor('waiting')).toEqual([{ label: 'Waiting on you', tone: 'red' }]);
    expect(chipsFor('task')).toEqual([{ label: 'Task', tone: 'blue' }]);
    expect(chipsFor('waiting_on_them')).toEqual([{ label: 'Waiting on them', tone: 'amber' }]);
    expect(chipsFor('decision')).toHaveLength(1);
  });
});

describe('cleanPreview', () => {
  it('cuts the quoted reply chain at "On … wrote:"', () => {
    expect(
      cleanPreview('Sounds good, approved. On Mon, Jun 8, Maya wrote: previous email body'),
    ).toBe('Sounds good, approved.');
  });

  it('collapses whitespace and handles null', () => {
    expect(cleanPreview('  hello \r\n world  ')).toBe('hello world');
    expect(cleanPreview(null)).toBe('');
  });
});
