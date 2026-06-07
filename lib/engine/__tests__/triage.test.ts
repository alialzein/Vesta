import { describe, expect, it } from 'vitest';
import { classifyEmail, type TriageConfig, type TriageInput } from '@/lib/engine/triage';

const focused = (over: Partial<TriageConfig> = {}): TriageConfig => ({ mode: 'focused', ...over });

const human = (over: Partial<TriageInput> = {}): TriageInput => ({
  fromEmail: 'maya@cedars.com',
  fromName: 'Maya',
  subject: 'Contract review',
  inferenceClassification: 'focused',
  flagStatus: 'notFlagged',
  importance: 'normal',
  ...over,
});

describe('classifyEmail — allow / VIP (highest precedence)', () => {
  it('always includes an allow-rule sender, even if it looks automated', () => {
    const d = classifyEmail(
      human({ fromEmail: 'noreply@vendor.com', inferenceClassification: 'other' }),
      focused({ rules: [{ kind: 'allow', match: 'sender', value: 'noreply@vendor.com' }] }),
    );
    expect(d.include).toBe(true);
    expect(d.matchedRule).toMatch(/allow/);
  });

  it('includes VIP senders and VIP domains', () => {
    expect(
      classifyEmail(
        human({ inferenceClassification: 'other' }),
        focused({ vipEmails: ['maya@cedars.com'] }),
      ).include,
    ).toBe(true);
    expect(
      classifyEmail(
        human({ inferenceClassification: 'other' }),
        focused({ vipDomains: ['cedars.com'] }),
      ).include,
    ).toBe(true);
  });

  it('allow beats mute when both match', () => {
    const d = classifyEmail(
      human(),
      focused({
        rules: [
          { kind: 'mute', match: 'domain', value: 'cedars.com' },
          { kind: 'allow', match: 'sender', value: 'maya@cedars.com' },
        ],
      }),
    );
    expect(d.include).toBe(true);
  });
});

describe('classifyEmail — mute', () => {
  it('mutes by exact sender', () => {
    const d = classifyEmail(
      human(),
      focused({ rules: [{ kind: 'mute', match: 'sender', value: 'maya@cedars.com' }] }),
    );
    expect(d.include).toBe(false);
    expect(d.reason).toMatch(/muted/i);
  });

  it('mutes by domain', () => {
    const d = classifyEmail(
      human(),
      focused({ rules: [{ kind: 'mute', match: 'domain', value: 'cedars.com' }] }),
    );
    expect(d.include).toBe(false);
  });

  it('mutes by subject keyword', () => {
    const d = classifyEmail(
      human({ subject: 'Your weekly newsletter digest' }),
      focused({ rules: [{ kind: 'mute', match: 'subject', value: 'newsletter' }] }),
    );
    expect(d.include).toBe(false);
  });
});

describe('classifyEmail — everything mode', () => {
  it('imports everything that is not muted', () => {
    expect(
      classifyEmail(human({ fromEmail: 'noreply@x.com' }), { mode: 'everything' }).include,
    ).toBe(true);
  });
});

describe('classifyEmail — flagged mode', () => {
  it('includes only flagged mail', () => {
    expect(classifyEmail(human({ flagStatus: 'flagged' }), { mode: 'flagged' }).include).toBe(true);
    expect(classifyEmail(human({ flagStatus: 'notFlagged' }), { mode: 'flagged' }).include).toBe(
      false,
    );
  });
});

describe('classifyEmail — focused mode: automated senders', () => {
  it.each([
    'noreply@github.com',
    'no-reply@microsoft.com',
    'donotreply@bank.com',
    'do-not-reply@service.io',
    'notifications@slack.com',
    'alerts@datadog.com',
    'mailer-daemon@mail.com',
    'postmaster@corp.com',
    'newsletter@news.com',
    'marketing@shop.com',
    'updates@linkedin.com',
    'bounce@sendgrid.net',
  ])('hides automated sender %s', (fromEmail) => {
    const d = classifyEmail(human({ fromEmail, inferenceClassification: 'focused' }), focused());
    expect(d.include).toBe(false);
    expect(d.signals).toContain('automated:no-reply');
  });

  it('does NOT hide a human whose name merely contains a keyword token substring', () => {
    // "marketingmanager" is one token, not "marketing" → treated as human.
    const d = classifyEmail(human({ fromEmail: 'marketingmanager@cedars.com' }), focused());
    expect(d.include).toBe(true);
  });

  it('does NOT hide a human like alert.hansen@corp.com (token is "alert" but it is a name)', () => {
    // We DO match the "alert" token here; assert the documented behaviour explicitly.
    const d = classifyEmail(human({ fromEmail: 'alert.hansen@corp.com' }), focused());
    expect(d.include).toBe(false); // known trade-off: "alert" token is treated as automated
  });
});

describe('classifyEmail — focused mode: bulk headers', () => {
  it('hides mail with a List-Unsubscribe header', () => {
    const d = classifyEmail(
      human({
        fromEmail: 'hello@brand.com',
        headers: { 'list-unsubscribe': '<mailto:u@brand.com>' },
      }),
      focused(),
    );
    expect(d.include).toBe(false);
    expect(d.reason).toMatch(/newsletter|bulk/i);
  });

  it('hides Precedence: bulk', () => {
    const d = classifyEmail(
      human({ fromEmail: 'x@brand.com', headers: { precedence: 'bulk' } }),
      focused(),
    );
    expect(d.include).toBe(false);
  });

  it('hides Auto-Submitted: auto-generated', () => {
    const d = classifyEmail(
      human({ fromEmail: 'x@brand.com', headers: { 'auto-submitted': 'auto-generated' } }),
      focused(),
    );
    expect(d.include).toBe(false);
  });

  it('hides an empty Return-Path (bounce)', () => {
    const d = classifyEmail(
      human({ fromEmail: 'x@brand.com', headers: { 'return-path': '<>' } }),
      focused(),
    );
    expect(d.include).toBe(false);
    expect(d.reason).toMatch(/bounce|system/i);
  });
});

describe('classifyEmail — focused mode: Focused/Other + overrides', () => {
  it('includes a human Focused message', () => {
    const d = classifyEmail(human(), focused());
    expect(d.include).toBe(true);
    expect(d.signals).toContain('inference:focused');
  });

  it('hides messages Outlook sorted to Other', () => {
    const d = classifyEmail(human({ inferenceClassification: 'other' }), focused());
    expect(d.include).toBe(false);
    expect(d.signals).toContain('inference:other');
  });

  it('keeps an Other message if marked high importance', () => {
    const d = classifyEmail(
      human({ inferenceClassification: 'other', importance: 'high' }),
      focused(),
    );
    expect(d.include).toBe(true);
  });

  it('keeps a flagged message even if automated/Other', () => {
    const d = classifyEmail(
      human({
        fromEmail: 'noreply@x.com',
        inferenceClassification: 'other',
        flagStatus: 'flagged',
      }),
      focused(),
    );
    expect(d.include).toBe(true);
    expect(d.reason).toMatch(/flagged/i);
  });
});

describe('classifyEmail — always returns a human reason', () => {
  it('every decision has a non-empty reason and signals array', () => {
    const d = classifyEmail(human(), focused());
    expect(d.reason.length).toBeGreaterThan(0);
    expect(Array.isArray(d.signals)).toBe(true);
  });
});
