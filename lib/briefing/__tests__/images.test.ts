import { describe, expect, it, vi } from 'vitest';
import {
  decodeGoogleNewsUrl,
  domainOf,
  extractOgImage,
  faviconUrl,
  resolveArticleVisual,
} from '@/lib/briefing/images';

/** Build a Google News RSS link whose base64 id embeds `url` the way the
 *  common "CBMi…" protobuf format does (field 2, length-prefixed string). */
function googleNewsLink(url: string): string {
  const bytes = [0x08, 0x13, 0x22, url.length, ...[...url].map((c) => c.charCodeAt(0)), 0x07];
  const b64 = Buffer.from(Uint8Array.from(bytes))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `https://news.google.com/rss/articles/${b64}?oc=5`;
}

describe('domainOf', () => {
  it('returns the hostname without www', () => {
    expect(domainOf('https://www.theverge.com/ai/123')).toBe('theverge.com');
    expect(domainOf('https://reuters.com/x')).toBe('reuters.com');
  });
  it('is null for garbage', () => {
    expect(domainOf('not a url')).toBeNull();
    expect(domainOf(null)).toBeNull();
  });
});

describe('decodeGoogleNewsUrl', () => {
  it('decodes the publisher URL out of a CBMi-style article id', () => {
    const real = 'https://www.reuters.com/technology/big-ai-story-2026';
    expect(decodeGoogleNewsUrl(googleNewsLink(real))).toBe(real);
  });

  it('returns null for non-Google links', () => {
    expect(decodeGoogleNewsUrl('https://www.bbc.com/news/article')).toBeNull();
  });

  it('returns null for undecodable ids instead of throwing', () => {
    expect(decodeGoogleNewsUrl('https://news.google.com/rss/articles/!!notb64!!')).toBeNull();
    expect(decodeGoogleNewsUrl('https://news.google.com/rss/articles/AAAA')).toBeNull();
  });
});

describe('extractOgImage', () => {
  it('reads og:image in either attribute order', () => {
    expect(
      extractOgImage('<meta property="og:image" content="https://img.example/a.jpg"/>'),
    ).toBe('https://img.example/a.jpg');
    expect(
      extractOgImage('<meta content="https://img.example/b.jpg" property="og:image"/>'),
    ).toBe('https://img.example/b.jpg');
  });

  it('accepts twitter:image and og:image:secure_url; decodes &amp;', () => {
    expect(
      extractOgImage('<meta name="twitter:image" content="https://img.example/c.jpg?w=1&amp;h=2">'),
    ).toBe('https://img.example/c.jpg?w=1&h=2');
    expect(
      extractOgImage('<meta property="og:image:secure_url" content="https://img.example/d.png">'),
    ).toBe('https://img.example/d.png');
  });

  it('rejects relative, non-http, and svg images', () => {
    expect(extractOgImage('<meta property="og:image" content="/img/a.jpg">')).toBeNull();
    expect(extractOgImage('<meta property="og:image" content="https://img.example/a.svg">')).toBeNull();
    expect(extractOgImage('<html>no tags</html>')).toBeNull();
  });
});

describe('faviconUrl', () => {
  it('builds the s2 favicon URL', () => {
    expect(faviconUrl('theverge.com')).toBe(
      'https://www.google.com/s2/favicons?domain=theverge.com&sz=64',
    );
  });
  it('strips www and rejects non-domains', () => {
    expect(faviconUrl('www.bbc.co.uk', 128)).toContain('domain=bbc.co.uk');
    expect(faviconUrl('localhost')).toBeNull();
    expect(faviconUrl(null)).toBeNull();
  });
});

describe('resolveArticleVisual', () => {
  it('fetches the decoded article page and returns its og:image', async () => {
    const real = 'https://www.reuters.com/technology/big-ai-story-2026';
    const fetcher = vi.fn(async () =>
      new Response('<meta property="og:image" content="https://img.example/hero.jpg">', {
        status: 200,
      }),
    ) as unknown as typeof fetch;
    const v = await resolveArticleVisual(googleNewsLink(real), { fetcher });
    expect(fetcher).toHaveBeenCalledWith(real, expect.anything());
    expect(v.imageUrl).toBe('https://img.example/hero.jpg');
    expect(v.articleUrl).toBe(real);
    expect(v.sourceDomain).toBe('reuters.com');
  });

  it('keeps the domain when the page fetch fails', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('blocked');
    }) as unknown as typeof fetch;
    const v = await resolveArticleVisual('https://www.ft.com/content/abc', { fetcher });
    expect(v.imageUrl).toBeNull();
    expect(v.sourceDomain).toBe('ft.com');
    expect(v.articleUrl).toBe('https://www.ft.com/content/abc');
  });

  it('yields nothing for an undecodable Google News stub (no wasted fetch)', async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const v = await resolveArticleVisual('https://news.google.com/rss/articles/AAAA', { fetcher });
    expect(fetcher).not.toHaveBeenCalled();
    expect(v).toEqual({ imageUrl: null, sourceDomain: null, articleUrl: null });
  });
});
