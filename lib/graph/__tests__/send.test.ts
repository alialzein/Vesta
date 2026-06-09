import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendReply, createReplyDraft } from '../send';

type Call = { url: string; method: string; body: unknown };

/** Mock global fetch and record each call; return canned responses by URL suffix. */
function mockGraph(): { calls: Call[] } {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({
        url,
        method: init?.method ?? 'GET',
        body: init?.body ? JSON.parse(init.body as string) : undefined,
      });
      if (url.endsWith('/createReply') || url.endsWith('/createReplyAll')) {
        return new Response(
          JSON.stringify({
            id: 'draft-123',
            subject: 'RE: Q3 budget',
            body: { contentType: 'html', content: '<div>quoted original</div>' },
            toRecipients: [{ emailAddress: { name: 'Maya', address: 'maya@acme.com' } }],
            ccRecipients: [],
          }),
          { status: 201 },
        );
      }
      // PATCH body, /send → no content.
      return new Response(null, { status: 202 });
    }),
  );
  return { calls };
}

afterEach(() => vi.unstubAllGlobals());

describe('sendReply', () => {
  it('creates a reply draft, patches the body with reply + quote, then sends', async () => {
    const { calls } = mockGraph();
    const out = await sendReply('tok', 'msg-1', 'Approved — go ahead.', { replyAll: false });

    // Three Graph calls in order: createReply (POST), PATCH body, send (POST).
    expect(calls).toHaveLength(3);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toContain('/me/messages/msg-1/createReply');
    expect(calls[1].method).toBe('PATCH');
    expect(calls[1].url).toContain('/me/messages/draft-123');
    expect(calls[2].method).toBe('POST');
    expect(calls[2].url).toContain('/me/messages/draft-123/send');

    // The patched body has the reply ABOVE the quoted original.
    const patched = (calls[1].body as { body: { content: string } }).body.content;
    expect(patched.indexOf('Approved')).toBeLessThan(patched.indexOf('quoted original'));

    expect(out.graphDraftId).toBe('draft-123');
    expect(out.to).toEqual([{ name: 'Maya', email: 'maya@acme.com' }]);
    expect(out.htmlSent).toContain('Approved');
  });

  it('uses createReplyAll when replyAll is set', async () => {
    const { calls } = mockGraph();
    await sendReply('tok', 'msg-1', 'Thanks all.', { replyAll: true });
    expect(calls[0].url).toContain('/createReplyAll');
  });

  it('PATCHes the manager\'s edited To/Cc/Bcc onto the draft', async () => {
    const { calls } = mockGraph();
    const out = await sendReply('tok', 'msg-1', 'Hi', {
      replyAll: false,
      recipients: {
        to: [{ name: 'Maya', email: 'maya@acme.com' }],
        cc: [{ name: null, email: 'lee@acme.com' }],
        bcc: [{ name: null, email: 'boss@acme.com' }],
      },
    });
    const patch = calls[1].body as {
      toRecipients: unknown[];
      ccRecipients: unknown[];
      bccRecipients: unknown[];
    };
    expect(patch.toRecipients).toEqual([{ emailAddress: { address: 'maya@acme.com', name: 'Maya' } }]);
    expect(patch.ccRecipients).toEqual([{ emailAddress: { address: 'lee@acme.com' } }]);
    expect(patch.bccRecipients).toEqual([{ emailAddress: { address: 'boss@acme.com' } }]);
    // The returned recipients reflect exactly what was sent.
    expect(out.bcc).toEqual([{ name: null, email: 'boss@acme.com' }]);
  });

  it('propagates a Graph error (e.g. 403 missing Mail.Send)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Access denied', { status: 403 })),
    );
    await expect(sendReply('tok', 'msg-1', 'hi', { replyAll: false })).rejects.toThrow(/403/);
  });
});

describe('createReplyDraft', () => {
  it('creates + patches the draft but does NOT call send', async () => {
    const { calls } = mockGraph();
    const out = await createReplyDraft('tok', 'msg-1', 'Draft only.', { replyAll: false });
    expect(calls).toHaveLength(2); // createReply + PATCH, no /send
    expect(calls.some((c) => c.url.endsWith('/send'))).toBe(false);
    expect(out.graphDraftId).toBe('draft-123');
  });
});
