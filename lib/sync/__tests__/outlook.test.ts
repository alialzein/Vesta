import { describe, expect, it } from 'vitest';
import {
  toEmailMessageRow,
  buildThreadRows,
  buildPeopleRows,
  buildWorkItemDrafts,
  classifyForSync,
  buildTriageRules,
} from '@/lib/sync/outlook';
import type { GraphMessage } from '@/lib/graph/mail';
import type { TriageConfig } from '@/lib/engine/triage';

const ctx = { userId: 'u1', integrationId: 'int1', mailboxId: 'mb1' };

function msg(over: Partial<GraphMessage>): GraphMessage {
  return { id: 'm1', conversationId: 'c1', ...over };
}

describe('toEmailMessageRow', () => {
  it('maps a Graph inbound message to an email_messages row', () => {
    const row = toEmailMessageRow(
      msg({
        id: 'AAA',
        conversationId: 'CONV',
        subject: 'Contract approval',
        bodyPreview: 'Please review',
        from: { emailAddress: { name: 'Maya', address: 'Maya@Cedars.com' } },
        toRecipients: [{ emailAddress: { name: 'Ali', address: 'ali@me.com' } }],
        receivedDateTime: '2026-06-07T09:00:00Z',
        isRead: false,
        hasAttachments: true,
      }),
      'inbound',
      ctx,
    );

    expect(row.user_id).toBe('u1');
    expect(row.mailbox_id).toBe('mb1');
    expect(row.graph_message_id).toBe('AAA');
    expect(row.direction).toBe('inbound');
    expect(row.subject).toBe('Contract approval');
    // Emails are lowercased for consistent matching.
    expect(row.sender_email).toBe('maya@cedars.com');
    expect(row.to_recipients).toEqual([{ name: 'Ali', email: 'ali@me.com' }]);
    expect(row.is_read).toBe(false);
    expect(row.has_attachments).toBe(true);
  });
});

describe('buildThreadRows', () => {
  it('groups messages by conversation and tracks latest timestamps', () => {
    const rows = buildThreadRows(
      [
        {
          msg: msg({
            id: 'a',
            conversationId: 'C',
            subject: 'Re: Hi',
            receivedDateTime: '2026-06-01T10:00:00Z',
          }),
          direction: 'inbound',
        },
        {
          msg: msg({ id: 'b', conversationId: 'C', sentDateTime: '2026-06-02T10:00:00Z' }),
          direction: 'outbound',
        },
        {
          msg: msg({
            id: 'c',
            conversationId: 'D',
            subject: 'Other',
            receivedDateTime: '2026-06-03T10:00:00Z',
          }),
          direction: 'inbound',
        },
      ],
      ctx,
    );

    expect(rows).toHaveLength(2); // C and D
    const c = rows.find((r) => r.graph_conversation_id === 'C')!;
    expect(c.latest_message_at).toBe('2026-06-02T10:00:00Z'); // newest of the two
    expect(c.latest_inbound_at).toBe('2026-06-01T10:00:00Z');
    expect(c.latest_outbound_at).toBe('2026-06-02T10:00:00Z');
    expect(c.subject_normalized).toBe('Hi'); // "Re: " stripped
  });

  it('skips messages without a conversation id', () => {
    const rows = buildThreadRows(
      [{ msg: msg({ conversationId: undefined }), direction: 'inbound' }],
      ctx,
    );
    expect(rows).toHaveLength(0);
  });
});

describe('buildPeopleRows', () => {
  it('extracts unique people (by lowercased email) with domain', () => {
    const rows = buildPeopleRows(
      [
        msg({
          from: { emailAddress: { name: 'Maya', address: 'maya@cedars.com' } },
          toRecipients: [{ emailAddress: { name: 'Ali', address: 'ali@me.com' } }],
        }),
        msg({
          from: { emailAddress: { name: 'Maya G', address: 'MAYA@cedars.com' } }, // dup email
          ccRecipients: [{ emailAddress: { name: 'Rania', address: 'rania@me.com' } }],
        }),
      ],
      'u1',
    );

    const emails = rows.map((r) => r.email).sort();
    expect(emails).toEqual(['ali@me.com', 'maya@cedars.com', 'rania@me.com']);
    expect(rows.find((r) => r.email === 'maya@cedars.com')?.domain).toBe('cedars.com');
  });
});

describe('buildWorkItemDrafts', () => {
  it('creates a work item only for conversations waiting on the manager', () => {
    const drafts = buildWorkItemDrafts(
      [
        // C: latest is inbound → waiting on manager → work item.
        {
          msg: msg({
            id: 'a',
            conversationId: 'C',
            subject: 'Re: Contract',
            bodyPreview: 'Any update?',
            from: { emailAddress: { name: 'Maya', address: 'maya@cedars.com' } },
            receivedDateTime: '2026-06-05T10:00:00Z',
          }),
          direction: 'inbound',
        },
        // D: manager replied last → no work item.
        {
          msg: msg({ id: 'b', conversationId: 'D', sentDateTime: '2026-06-05T11:00:00Z' }),
          direction: 'outbound',
        },
      ],
      ctx,
    );

    expect(drafts).toHaveLength(1);
    const d = drafts[0];
    expect(d.conversationId).toBe('C');
    expect(d.row.source).toBe('outlook');
    expect(d.row.source_external_id).toBe('C');
    expect(d.row.title).toBe('Contract'); // "Re: " stripped
    expect(d.row.requires_reply).toBe(true);
    expect(d.row.category).toBe('waiting');
    expect(d.row.priority_score ?? 0).toBeGreaterThan(0);
    expect(d.row.urgency_reason).toMatch(/waiting on your reply/i);
  });

  it('sets metadata on EVERY draft so a mixed batch insert cannot null it', () => {
    // In a multi-row PostgREST insert the column set is the union of all rows'
    // keys; rows missing a key get explicit NULL (not the column default). One
    // "waiting on you" row without metadata next to a "waiting on them" row
    // with it violated work_items.metadata NOT NULL and failed the whole
    // batch — silently emptying the radar after an Outlook reconnect.
    const drafts = buildWorkItemDrafts(
      [
        // Waiting on the manager (inbound only).
        {
          msg: msg({
            id: 'a',
            conversationId: 'C1',
            subject: 'Need approval',
            from: { emailAddress: { name: 'Maya', address: 'maya@cedars.com' } },
            receivedDateTime: '2026-06-05T10:00:00Z',
          }),
          direction: 'inbound',
        },
        // Waiting on them (manager replied last, asking for something).
        {
          msg: msg({
            id: 'b',
            conversationId: 'C2',
            subject: 'Re: Budget',
            bodyPreview: 'Can you send me the final numbers?',
            toRecipients: [{ emailAddress: { name: 'Sam', address: 'sam@cedars.com' } }],
            sentDateTime: '2026-06-06T10:00:00Z',
          }),
          direction: 'outbound',
        },
      ],
      ctx,
    );

    expect(drafts).toHaveLength(2);
    for (const d of drafts) {
      expect(d.row.metadata).toBeDefined();
      expect(d.row.metadata).not.toBeNull();
    }
  });
});

describe('buildWorkItemDrafts — waiting on them (Phase 8)', () => {
  it('creates a waiting_on_them item when the manager replied asking for something', () => {
    const drafts = buildWorkItemDrafts(
      [
        {
          msg: msg({
            id: 'a',
            conversationId: 'W',
            subject: 'Budget',
            from: { emailAddress: { name: 'Maya', address: 'maya@cedars.com' } },
            receivedDateTime: '2026-06-05T10:00:00Z',
          }),
          direction: 'inbound',
        },
        {
          msg: msg({
            id: 'b',
            conversationId: 'W',
            subject: 'Re: Budget',
            bodyPreview: 'Can you send me the final numbers?',
            toRecipients: [{ emailAddress: { name: 'Maya', address: 'maya@cedars.com' } }],
            sentDateTime: '2026-06-06T10:00:00Z',
          }),
          direction: 'outbound',
        },
      ],
      ctx,
    );

    expect(drafts).toHaveLength(1);
    const d = drafts[0];
    expect(d.row.category).toBe('waiting_on_them');
    expect(d.row.requires_reply).toBe(false);
    expect(d.row.urgency_reason).toMatch(/waiting on maya/i);
  });

  it('does NOT create one for a closing reply (thanks)', () => {
    const drafts = buildWorkItemDrafts(
      [
        {
          msg: msg({
            id: 'a',
            conversationId: 'X',
            from: { emailAddress: { address: 'maya@cedars.com' } },
            receivedDateTime: '2026-06-05T10:00:00Z',
          }),
          direction: 'inbound',
        },
        {
          msg: msg({
            id: 'b',
            conversationId: 'X',
            bodyPreview: 'Thanks!',
            sentDateTime: '2026-06-06T10:00:00Z',
          }),
          direction: 'outbound',
        },
      ],
      ctx,
    );
    expect(drafts).toHaveLength(0);
  });

  it('off mode creates no waiting_on_them items', () => {
    const drafts = buildWorkItemDrafts(
      [
        {
          msg: msg({
            id: 'b',
            conversationId: 'W',
            bodyPreview: 'Can you send it over?',
            sentDateTime: '2026-06-06T10:00:00Z',
          }),
          direction: 'outbound',
        },
      ],
      ctx,
      Date.now(),
      { replyIntentMode: 'off' },
    );
    expect(drafts).toHaveLength(0);
  });
});

describe('classifyForSync', () => {
  const focused: TriageConfig = { mode: 'focused' };

  it('always keeps outbound (the manager’s own replies), even from a no-reply address', () => {
    const out = classifyForSync(
      [
        {
          msg: msg({ from: { emailAddress: { address: 'noreply@x.com' } } }),
          direction: 'outbound',
        },
      ],
      focused,
    );
    expect(out[0].include).toBe(true);
    expect(out[0].reason).toMatch(/sent by you/i);
  });

  it('hides automated inbound but keeps a real person', () => {
    const out = classifyForSync(
      [
        {
          msg: msg({
            id: 'noise',
            from: { emailAddress: { address: 'noreply@news.com' } },
            inferenceClassification: 'focused',
          }),
          direction: 'inbound',
        },
        {
          msg: msg({
            id: 'real',
            from: { emailAddress: { address: 'maya@cedars.com' } },
            inferenceClassification: 'focused',
          }),
          direction: 'inbound',
        },
      ],
      focused,
    );
    const byId = (id: string) => out.find((c) => c.tagged.msg.id === id)!;
    expect(byId('noise').include).toBe(false);
    expect(byId('real').include).toBe(true);
  });
});

describe('buildTriageRules', () => {
  it('maps enabled suppression/allow rows to triage rules and skips the rest', () => {
    const rules = buildTriageRules([
      {
        rule_type: 'suppression',
        conditions: { match: 'domain', value: 'microsoft.com' },
        is_enabled: true,
      },
      {
        rule_type: 'allow',
        conditions: { match: 'sender', value: 'ceo@corp.com' },
        is_enabled: true,
      },
      { rule_type: 'suppression', conditions: { value: 'spam@x.com' }, is_enabled: true }, // match defaults to sender
      {
        rule_type: 'suppression',
        conditions: { match: 'domain', value: 'x.com' },
        is_enabled: false,
      }, // disabled
      { rule_type: 'allow', conditions: { match: 'subject', value: 'urgent' }, is_enabled: true }, // allow+subject skipped
      { rule_type: 'tone', conditions: { match: 'sender', value: 'x' }, is_enabled: true }, // not triage
    ]);

    expect(rules).toEqual([
      { kind: 'mute', match: 'domain', value: 'microsoft.com' },
      { kind: 'allow', match: 'sender', value: 'ceo@corp.com' },
      { kind: 'mute', match: 'sender', value: 'spam@x.com' },
    ]);
  });
});
