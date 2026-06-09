import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendReply, createReplyDraft } from '../send';

type Call = { url: string; method: string; body: unknown };

const recipients = {
  to: [{ name: 'Maya', email: 'maya@acme.com' }],
  cc: [{ name: null, email: 'lee@acme.com' }],
  bcc: [{ name: null, email: 'boss@acme.com' }],
};

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
      if (url.endsWith('/createReply')) {
        return new Response(JSON.stringify({ id: 'draft-123', subject: 'RE: Q3 budget' }), {
          status: 201,
        });
      }
      // /reply, PATCH → no content.
      return new Response(null, { status: 202 });
    }),
  );
  return { calls };
}

afterEach(() => vi.unstubAllGlobals());

describe('sendReply (reply action, Mail.Send only)', () => {
  it('POSTs the reply action once with the HTML body + exact recipients', async () => {
    const { calls } = mockGraph();
    const out = await sendReply('tok', 'msg-1', '<p>Approved.</p>', { recipients });

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toContain('/me/messages/msg-1/reply');

    const body = calls[0].body as {
      message: {
        body: { contentType: string; content: string };
        toRecipients: unknown[];
        ccRecipients: unknown[];
        bccRecipients: unknown[];
      };
    };
    expect(body.message.body).toEqual({ contentType: 'HTML', content: '<p>Approved.</p>' });
    expect(body.message.toRecipients).toEqual([
      { emailAddress: { address: 'maya@acme.com', name: 'Maya' } },
    ]);
    expect(body.message.ccRecipients).toEqual([{ emailAddress: { address: 'lee@acme.com' } }]);
    expect(body.message.bccRecipients).toEqual([{ emailAddress: { address: 'boss@acme.com' } }]);

    expect(out.graphDraftId).toBeNull();
    expect(out.htmlSent).toBe('<p>Approved.</p>');
    expect(out.bcc).toEqual(recipients.bcc);
  });

  it('does NOT call createReply (which would need Mail.ReadWrite)', async () => {
    const { calls } = mockGraph();
    await sendReply('tok', 'msg-1', '<p>hi</p>', { recipients });
    expect(calls.some((c) => c.url.includes('createReply'))).toBe(false);
  });

  it('propagates a Graph error (e.g. 403 missing Mail.Send)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('Access denied', { status: 403 })),
    );
    await expect(sendReply('tok', 'msg-1', '<p>hi</p>', { recipients })).rejects.toThrow(/403/);
  });
});

describe('createReplyDraft (draft-only, Mail.ReadWrite)', () => {
  it('creates a draft and PATCHes the body + recipients, without sending', async () => {
    const { calls } = mockGraph();
    const out = await createReplyDraft('tok', 'msg-1', '<p>Draft.</p>', { recipients });

    expect(calls).toHaveLength(2); // createReply + PATCH, no /reply, no /send
    expect(calls[0].url).toContain('/createReply');
    expect(calls[1].method).toBe('PATCH');
    expect(calls.some((c) => c.url.endsWith('/reply') || c.url.endsWith('/send'))).toBe(false);
    expect(out.graphDraftId).toBe('draft-123');
  });
});
