import { describe, expect, it } from 'vitest';
import {
  isAddressedToManager,
  managerAddressesInConversation,
  buildWorkItemDrafts,
} from '../outlook';
import type { GraphMessage } from '@/lib/graph/mail';

const MGR = 'boss@corp.com';
const ALIAS = 'boss.alias@corp.com';
const ctx = { userId: 'u1', integrationId: 'i1', mailboxId: 'm1' };
const msg = (over: Partial<GraphMessage>): GraphMessage => ({ id: 'x', ...over });
const tag = (over: Partial<GraphMessage>, direction: 'inbound' | 'outbound') => ({
  msg: msg(over),
  direction,
});

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

  it('true — addressed to an alias once the alias is in the known set', () => {
    const m = msg({ toRecipients: [{ emailAddress: { address: ALIAS } }] });
    expect(isAddressedToManager(m, [MGR])).toBe(false); // primary only -> miss
    expect(isAddressedToManager(m, [MGR, ALIAS])).toBe(true); // alias known -> hit
  });
});

describe('managerAddressesInConversation', () => {
  it('adds the address the manager actually sent FROM to the base set', () => {
    const msgs = [
      tag({ from: { emailAddress: { address: 'BOSS.ALIAS@corp.com' } } }, 'outbound'),
      tag({ from: { emailAddress: { address: 's@x.com' } } }, 'inbound'),
    ];
    expect(managerAddressesInConversation(msgs, [MGR]).sort()).toEqual([ALIAS, MGR].sort());
  });

  it('falls back to sender, lowercases, and dedupes', () => {
    const msgs = [
      tag({ sender: { emailAddress: { address: 'Boss@Corp.com' } } }, 'outbound'),
      tag({ from: { emailAddress: { address: ALIAS } } }, 'outbound'),
    ];
    expect(managerAddressesInConversation(msgs, [MGR]).sort()).toEqual([ALIAS, MGR].sort());
  });

  it('returns just the base when there are no outbound messages', () => {
    expect(managerAddressesInConversation([tag({}, 'inbound')], [MGR])).toEqual([MGR]);
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

  it('keeps a waiting thread addressed to an ALIAS the manager replied from', () => {
    const outbound = tag(
      { conversationId: 'c1', from: { emailAddress: { address: ALIAS } }, sentDateTime: '2026-06-08T09:00:00Z' },
      'outbound',
    );
    const drafts = buildWorkItemDrafts(
      [outbound, inbound({ toRecipients: [{ emailAddress: { address: ALIAS } }] })],
      { ...ctx, managerEmails: [MGR] },
    );
    expect(drafts).toHaveLength(1);
  });

  it('still drops a true broadcast even with the alias rule in play', () => {
    const outbound = tag(
      { conversationId: 'c1', from: { emailAddress: { address: ALIAS } }, sentDateTime: '2026-06-08T09:00:00Z' },
      'outbound',
    );
    const drafts = buildWorkItemDrafts(
      [outbound, inbound({ toRecipients: [{ emailAddress: { address: 'list@x.com' } }] })],
      { ...ctx, managerEmails: [MGR] },
    );
    expect(drafts).toHaveLength(0);
  });
});
