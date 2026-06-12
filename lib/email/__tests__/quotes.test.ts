import { describe, expect, it } from 'vitest';
import { splitQuotedHtml, splitQuotedText } from '@/lib/email/quotes';

describe('splitQuotedHtml', () => {
  it('cuts at the Outlook reply separator, at the tag boundary', () => {
    const html =
      '<div>Thanks Ali, approved.</div><hr><div id="divRplyFwdMsg"><b>From:</b> Ali Alzein</div><div>original mail…</div>';
    const { main, quoted } = splitQuotedHtml(html);
    expect(main).toBe('<div>Thanks Ali, approved.</div><hr>');
    expect(quoted).toContain('divRplyFwdMsg');
    expect(quoted).toContain('original mail…');
  });

  it('cuts at gmail_quote and at the classic Outlook desktop separator', () => {
    const gmail = splitQuotedHtml(
      '<p>New text</p><div class="gmail_quote_container">On Fri… wrote:<br>old</div>',
    );
    expect(gmail.main).toBe('<p>New text</p>');
    expect(gmail.quoted).toContain('gmail_quote');

    const desktop = splitQuotedHtml(
      '<p>Reply body</p><div style="border:none;border-top:solid #E1E1E1 1.0pt;padding:3pt">From: X</div>',
    );
    expect(desktop.main).toBe('<p>Reply body</p>');
    expect(desktop.quoted).toContain('#E1E1E1');
  });

  it("cuts at Vesta's own reply-quote block (the send flow builds it)", () => {
    // The exact shape buildQuotedOriginal produces (lib/email/reply).
    const html =
      '<p>Your request to be off next Monday is not approved.</p>\n' +
      '<div style="border-top:1px solid #d0d0d0;margin-top:14px;padding-top:10px;color:#666;font-size:12px"><b>From:</b> Ali &lt;ali@x.com&gt;<br><b>Sent:</b> Tue, 09 Jun 2026</div>\n' +
      '<blockquote style="margin:8px 0 0">original</blockquote>';
    const { main, quoted } = splitQuotedHtml(html);
    expect(main.trim()).toBe('<p>Your request to be off next Monday is not approved.</p>');
    expect(quoted).toContain('<b>From:</b>');
  });

  it('falls back to a generic bolded From: header block', () => {
    const html = '<p>Sure.</p><div><p><b>From:</b> Maya<br><b>Sent:</b> Monday</p>old</div>';
    expect(splitQuotedHtml(html).main).toBe('<p>Sure.</p><div><p>');
  });

  it('uses the EARLIEST marker when several exist', () => {
    const html =
      '<p>hi</p><div class="gmail_quote">a</div><div id="divRplyFwdMsg">b</div>';
    expect(splitQuotedHtml(html).main).toBe('<p>hi</p>');
  });

  it('keeps the body whole when there is no marker', () => {
    const html = '<p>Just a normal email with a <blockquote>pull quote</blockquote>.</p>';
    expect(splitQuotedHtml(html)).toEqual({ main: html, quoted: null });
  });

  it('keeps a pure forward whole (nothing visible before the marker)', () => {
    const html = '<div> </div><div id="divRplyFwdMsg">From: someone</div><p>forwarded</p>';
    expect(splitQuotedHtml(html).quoted).toBeNull();
  });
});

describe('splitQuotedText', () => {
  it('cuts at a pasted From:/Sent: header block', () => {
    const text = 'i need your confirmation to be off on monday.\n\nFrom: Ali Alzein <ali@x.com>\nSent: Tue, 09 Jun 2026\nTo: someone\n\nearlier…';
    const { main, quoted } = splitQuotedText(text);
    expect(main).toBe('i need your confirmation to be off on monday.');
    expect(quoted).toContain('From: Ali Alzein');
  });

  it('cuts at "On … wrote:" and at -----Original Message-----', () => {
    expect(splitQuotedText('Sure!\nOn Tue, Jun 9, Maya wrote:\n> hi').main).toBe('Sure!');
    expect(splitQuotedText('Done.\n-----Original Message-----\nFrom: x').main).toBe('Done.');
  });

  it('keeps plain messages and pure forwards whole', () => {
    expect(splitQuotedText('No quoting here at all.')).toEqual({
      main: 'No quoting here at all.',
      quoted: null,
    });
    expect(splitQuotedText('\nFrom: x <x@x.com>\nSent: y\nbody').quoted).toBeNull();
  });
});
