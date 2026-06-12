import { describe, expect, it } from 'vitest';
import { linkifySegments, simpleEmailText } from '@/lib/email/render';

describe('simpleEmailText', () => {
  it('extracts theme-native text from plain correspondence HTML', () => {
    const html =
      '<html><head><style>p{margin:0}</style></head><body><p>Hello Ali,</p><p>Your request to be off next Monday is not approved.</p><p>Best regards,<br>Vesta Dev</p></body></html>';
    expect(simpleEmailText(html)).toBe(
      'Hello Ali,\nYour request to be off next Monday is not approved.\nBest regards,\nVesta Dev',
    );
  });

  it('a signature with images and a table stays native (images dropped)', () => {
    const html =
      '<p>Hello,</p><p>This is test email two</p><p><b>Best regards,</b></p>' +
      '<table><tr><td><img src="cid:logo"></td><td><b>Ali Alzein</b><br>Solution Support Team Leader<br>' +
      'T: 00961 | M: +96176056494<br><img src="https://x/fb.png"><img src="https://x/li.png"></td></tr></table>';
    const text = simpleEmailText(html)!;
    expect(text).toContain('This is test email two');
    expect(text).toContain('Solution Support Team Leader');
    expect(text).not.toContain('cid:');
  });

  it('keeps genuinely rich mail (heavy tables, backgrounds, image-only) on the iframe path', () => {
    expect(
      simpleEmailText('<table><tr><td><table><tr><td><table></table><table></table>promo</td></tr></table></td></tr></table>'),
    ).toBeNull(); // > 3 tables = designed layout
    expect(simpleEmailText('<div style="background-color:#001133">dark brand</div>')).toBeNull();
    expect(simpleEmailText('<img src="https://x/banner.png">')).toBeNull(); // image-only → empty text
  });

  it('survives lists, entities, and links', () => {
    const html =
      '<ul><li>First &amp; second</li><li>N&deg; 2</li></ul><p>See <a href="https://vesta.app/docs">the docs</a> or https inline.</p>';
    const text = simpleEmailText(html)!;
    expect(text).toContain('• First & second');
    expect(text).toContain('the docs (https://vesta.app/docs)');
  });

  it('returns null for empty-after-stripping bodies', () => {
    expect(simpleEmailText('<div>&nbsp;</div>')).toBeNull();
  });
});

describe('linkifySegments', () => {
  it('splits text around URLs (trailing punctuation stays text)', () => {
    expect(linkifySegments('see https://x.dev/a, then call')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'link', value: 'https://x.dev/a' },
      { type: 'text', value: ', then call' },
    ]);
  });

  it('passes through link-free text untouched', () => {
    expect(linkifySegments('no links')).toEqual([{ type: 'text', value: 'no links' }]);
  });
});
