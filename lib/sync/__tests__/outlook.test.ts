import { describe, expect, it } from 'vitest';
import {
  toEmailMessageRow,
  buildThreadRows,
  buildPeopleRows,
  buildWorkItemDrafts,
} from '@/lib/sync/outlook';
import type { GraphMessage } from '@/lib/graph/mail';

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
});
