import { describe, expect, it } from 'vitest';
import { isAddressedToManager, buildWorkItemDrafts } from '../outlook';
import type { GraphMessage } from '@/lib/graph/mail';

const MGR = 'boss@corp.com';
const ctx = { userId: 'u1', integrationId: 'i1', mailboxId: 'm1' };
const msg = (over: Partial<GraphMessage>): GraphMessage => ({ id: 'x', ...over });

describe('isAddressedToManager', () => {
  it('true — manager is a direct To recipient (case-insensitive)', () => {
    const m = msg({ toRecipients: [{ emailAddress: { address: 'BOSS@corp.com' } }] });
    expect(isAddressedToManager(m, [MGR])).toBe(true);
  });

  it('true — manager email mentioned in the body preview', () => {
    expect(isAddressedToManager(msg({ bodyPreview: 'pls loop in boss@corp.com here' }), [MGR])).toBe(
      true,
    );
  });

  it('false — broadcast where the manager is not in To and not mentioned', () => {
    const m = msg({
      toRecipients: [{ emailAddress: { address: 'a@x.com' } }, { emailAddress: { address: 'b@x.com' } }],
    });
    expect(isAddressedToManager(m, [MGR])).toBe(false);
  });

  it('false — manager only Cc (not To, not mentioned)', () => {
    const m = msg({
      toRecipients: [{ emailAddress: { address: 'a@x.com' } }],
      ccRecipients: [{ emailAddress: { address: MGR } }],
    });
    expect(isAddressedToManager(m, [MGR])).toBe(false);
  });

  it('true — no manager email known (do not over-filter)', () => {
    expect(isAddressedToManager(msg({ toRecipients: [{ emailAddress: { address: 'a@x.com' } }] }), [])).toBe(
      true,
    );
  });
});

describe('buildWorkItemDrafts — addressing gate', () => {
  const inbound = (over: Partial<GraphMessage>) => ({
    msg: msg({
      conversationId: 'c1',
      from: { emailAddress: { address: 's@x.com', name: 'S' } },
      receivedDateTime: '2026-06-08T10:00:00Z',
      ...over,
    }),
    direction: 'inbound' as const,
  });

  it('drops a waiting thread that is a broadcast (manager not addressed)', () => {
    const drafts = buildWorkItemDrafts([inbound({ toRecipients: [{ emailAddress: { address: 'list@x.com' } }] })], {
      ...ctx,
      managerEmails: [MGR],
    });
    expect(drafts).toHaveLength(0);
  });

  it('keeps a waiting thread addressed to the manager (To)', () => {
    const drafts = buildWorkItemDrafts([inbound({ toRecipients: [{ emailAddress: { address: MGR } }] })], {
      ...ctx,
      managerEmails: [MGR],
    });
    expect(drafts).toHaveLength(1);
  });

  it('keeps everything when the manager email is unknown', () => {
    const drafts = buildWorkItemDrafts([inbound({ toRecipients: [{ emailAddress: { address: 'list@x.com' } }] })], ctx);
    expect(drafts).toHaveLength(1);
  });
});
