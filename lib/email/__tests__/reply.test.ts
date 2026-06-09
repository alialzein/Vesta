import { describe, expect, it } from 'vitest';
import {
  buildReplyRecipients,
  composeReplyHtml,
  dedupeRecipients,
  detectSensitiveTopics,
  escapeHtml,
  isValidEmail,
  normalizeRecipient,
  replyTextToHtml,
  toGraphRecipients,
} from '@/lib/email/reply';

const sender = { name: 'Maya Chen', email: 'maya@acme.com' };
const me = { name: 'Ali', email: 'ali@vesta.app' };
const other = { name: 'Sam', email: 'sam@acme.com' };

describe('buildReplyRecipients', () => {
  it('reply (not all) addresses only the original sender', () => {
    const r = buildReplyRecipients(
      { from: sender, to: [me, other], cc: [{ email: 'cc@acme.com' }] },
      ['ali@vesta.app'],
      { replyAll: false },
    );
    expect(r.to).toEqual([{ name: 'Maya Chen', email: 'maya@acme.com' }]);
    expect(r.cc).toEqual([]);
  });

  it('reply all keeps sender + original To and Cc, minus the manager', () => {
    const r = buildReplyRecipients(
      { from: sender, to: [me, other], cc: [{ name: 'Lee', email: 'lee@acme.com' }] },
      ['ali@vesta.app'],
      { replyAll: true },
    );
    expect(r.to.map((x) => x.email)).toEqual(['maya@acme.com', 'sam@acme.com']);
    expect(r.cc.map((x) => x.email)).toEqual(['lee@acme.com']);
  });

  it('de-duplicates an address that appears in multiple fields', () => {
    const r = buildReplyRecipients(
      { from: sender, to: [sender, other], cc: [other] },
      [],
      { replyAll: true },
    );
    expect(r.to.map((x) => x.email)).toEqual(['maya@acme.com', 'sam@acme.com']);
    expect(r.cc).toEqual([]); // sam already in To
  });

  it('handles a missing sender / empty lists without throwing', () => {
    const r = buildReplyRecipients({}, ['ali@vesta.app'], { replyAll: true });
    expect(r.to).toEqual([]);
    expect(r.cc).toEqual([]);
  });

  it('is case-insensitive when removing the manager and de-duping', () => {
    const r = buildReplyRecipients(
      { from: { email: 'MAYA@acme.com' }, to: [{ email: 'Ali@Vesta.app' }] },
      ['ali@vesta.app'],
      { replyAll: true },
    );
    expect(r.to.map((x) => x.email)).toEqual(['MAYA@acme.com']);
  });
});

describe('replyTextToHtml / composeReplyHtml', () => {
  it('splits paragraphs and escapes HTML', () => {
    const html = replyTextToHtml('Hi <b>Maya</b>,\n\nThanks!');
    expect(html).toContain('<p>Hi &lt;b&gt;Maya&lt;/b&gt;,</p>');
    expect(html).toContain('<p>Thanks!</p>');
  });

  it('turns single newlines into <br>', () => {
    expect(replyTextToHtml('line1\nline2')).toBe('<p>line1<br>line2</p>');
  });

  it('appends the quoted original below the reply', () => {
    const out = composeReplyHtml('Approved.', '<div>quoted</div>');
    expect(out.indexOf('Approved')).toBeLessThan(out.indexOf('quoted'));
    expect(out).toContain('<div>quoted</div>');
  });

  it('works with no quote', () => {
    expect(composeReplyHtml('Hi', null)).toBe('<p>Hi</p>');
  });
});

describe('escapeHtml', () => {
  it('escapes the dangerous characters', () => {
    expect(escapeHtml(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  });
});

describe('isValidEmail', () => {
  it('accepts well-formed addresses and rejects junk', () => {
    expect(isValidEmail('a@b.com')).toBe(true);
    expect(isValidEmail('first.last@sub.domain.io')).toBe(true);
    expect(isValidEmail('no-at')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('a b@c.com')).toBe(false);
  });
});

describe('normalizeRecipient', () => {
  it('parses a bare email', () => {
    expect(normalizeRecipient('  maya@acme.com ')).toEqual({ name: null, email: 'maya@acme.com' });
  });
  it('parses "Name <email>"', () => {
    expect(normalizeRecipient('Maya Chen <maya@acme.com>')).toEqual({
      name: 'Maya Chen',
      email: 'maya@acme.com',
    });
  });
  it('returns null for an invalid address', () => {
    expect(normalizeRecipient('not an email')).toBeNull();
    expect(normalizeRecipient('')).toBeNull();
  });
});

describe('dedupeRecipients', () => {
  it('drops empties and case-insensitive duplicates', () => {
    const out = dedupeRecipients([
      { email: 'A@x.com', name: 'A' },
      { email: 'a@x.com', name: 'dup' },
      { email: '', name: 'none' },
      { email: 'b@x.com', name: null },
    ]);
    expect(out.map((r) => r.email)).toEqual(['A@x.com', 'b@x.com']);
  });
});

describe('toGraphRecipients', () => {
  it('maps to the Graph emailAddress shape, with name only when present', () => {
    expect(
      toGraphRecipients([
        { name: 'Maya', email: 'maya@acme.com' },
        { name: null, email: 'sam@acme.com' },
      ]),
    ).toEqual([
      { emailAddress: { address: 'maya@acme.com', name: 'Maya' } },
      { emailAddress: { address: 'sam@acme.com' } },
    ]);
  });
});

describe('detectSensitiveTopics', () => {
  it('flags finance + contract language', () => {
    const t = detectSensitiveTopics('Please approve the invoice and sign the contract.');
    expect(t).toContain('finance');
    expect(t).toContain('contract');
  });

  it('returns nothing for ordinary text', () => {
    expect(detectSensitiveTopics('Lunch at noon tomorrow?')).toEqual([]);
  });

  it('handles null/empty', () => {
    expect(detectSensitiveTopics(null)).toEqual([]);
    expect(detectSensitiveTopics('')).toEqual([]);
  });
});
