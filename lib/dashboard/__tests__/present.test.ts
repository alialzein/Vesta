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

  it('flags a past due_at as Overdue with the original date as detail', () => {
    const due = dueOf('2026-06-09T16:00:00Z', 'waiting', now);
    expect(due.overdue).toBe(true);
    expect(due.label).toBe('Overdue');
    expect(due.detail).toMatch(/was due/);
  });

  it('keeps a future due_at as a neutral "Due …" label', () => {
    const due = dueOf('2026-06-12T16:00:00Z', 'waiting', now);
    expect(due.overdue).toBe(false);
    expect(due.label).toMatch(/^Due /);
  });

  it('uses the category wording when there is no due date', () => {
    expect(dueOf(null, 'waiting', now)).toEqual({ label: 'Waiting on you', overdue: false });
    expect(dueOf(null, 'fyi', now)).toEqual({ label: 'In your queue', overdue: false });
  });
});

describe('chipsFor', () => {
  it('tags High priority only for the red band (85+), matching the badge color', () => {
    expect(chipsFor('waiting', 85).some((c) => c.label === 'High priority')).toBe(true);
    // 80–84 is the amber band — the old 80+ chip contradicted the amber badge.
    expect(chipsFor('waiting', 80).some((c) => c.label === 'High priority')).toBe(false);
  });

  it('keeps the category chip first', () => {
    expect(chipsFor('waiting', 90)[0]).toEqual({ label: 'Waiting on you', tone: 'red' });
    expect(chipsFor('task', 10)[0]).toEqual({ label: 'Task', tone: 'blue' });
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
