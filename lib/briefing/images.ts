/**
 * Personal Intelligence Brief — article visuals (pure helpers + one fetcher).
 *
 * Goal: give every briefing card a real image when we can get one, and a
 * graceful branded fallback when we can't. Everything here is best-effort —
 * a missing image must never delay or break briefing generation.
 *
 * Where images come from, in order:
 *   1. The article page's `og:image` / `twitter:image` meta tag. Google News
 *      RSS links are redirect stubs, so we first try to decode the real
 *      publisher URL out of the base64 article id (works for the common
 *      "CBMi…" format; newer opaque ids simply yield null).
 *   2. The publisher's favicon (Google s2 service) — used as a source logo
 *      chip next to the source name, not as the hero image.
 *   3. The UI renders a deterministic category-gradient panel when there is
 *      no image at all (see BriefingView).
 */

/** Hostname of a URL without the leading www., or null when unparseable. */
export function domainOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

/** Base64 → latin1 in any runtime (this module is imported by client code
 *  for faviconUrl, so it must not assume Node's Buffer exists). */
function b64ToLatin1(b64: string): string | null {
  try {
    if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('latin1');
    if (typeof atob === 'function') return atob(b64);
    return null;
  } catch {
    return null;
  }
}

/**
 * Best-effort decode of a Google News RSS article link to the real publisher
 * URL. The path's base64url id is a protobuf whose second field is usually the
 * plain article URL ("CBMi…" ids) — we scan the decoded bytes for an http(s)
 * run. Returns null for non-Google links or undecodable ids (never throws).
 */
export function decodeGoogleNewsUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.hostname.endsWith('news.google.com')) return null;
  const m = parsed.pathname.match(/\/(?:rss\/)?articles\/([^/?#]+)/);
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const decoded = b64ToLatin1(b64);
    if (!decoded) return null;
    // Take the longest plausible http(s) run; stop at protobuf control bytes.
    const urls = decoded.match(/https?:\/\/[\x21-\x7e]+/g) ?? [];
    for (const candidate of urls.sort((a, b) => b.length - a.length)) {
      // Trim trailing protobuf length-prefix garbage that survived the regex.
      const clean = candidate.replace(/[^\x21-\x7e]+.*$/, '').replace(/\\.*$/, '');
      try {
        const u = new URL(clean);
        if (!u.hostname.includes('.') || u.hostname.endsWith('google.com')) continue;
        return u.toString();
      } catch {
        /* try the next run */
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** Publisher favicon via Google's s2 service (keyless, cached by Google). */
export function faviconUrl(domain: string | null | undefined, size = 64): string | null {
  if (!domain) return null;
  const clean = domain.trim().toLowerCase().replace(/^www\./, '');
  if (!clean || !clean.includes('.')) return null;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(clean)}&sz=${size}`;
}

/**
 * Pull the social-preview image URL out of an article's HTML head.
 * Accepts og:image (any variant) or twitter:image; both attribute orders.
 * Rejects non-http(s) and svg results.
 */
export function extractOgImage(html: string): string | null {
  const head = html.slice(0, 120_000); // meta tags live in <head>; don't scan megabytes
  const patterns = [
    /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url|:url)?|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url|:url)?|twitter:image(?::src)?)["']/i,
  ];
  for (const re of patterns) {
    const m = head.match(re);
    if (!m) continue;
    const url = m[1].replace(/&amp;/g, '&').trim();
    if (!/^https?:\/\//i.test(url)) continue;
    if (/\.svg(\?|#|$)/i.test(url)) continue;
    return url;
  }
  return null;
}

export type ArticleVisual = {
  /** Hero image for the card, when the article page yielded one. */
  imageUrl: string | null;
  /** Publisher domain (for the favicon chip), when known. */
  sourceDomain: string | null;
  /** The decoded/direct publisher URL, when known (nicer than the RSS stub). */
  articleUrl: string | null;
};

/**
 * Resolve the visual for one candidate URL: decode Google News stubs, fetch
 * the article page (short timeout), and read its og:image. Any failure —
 * timeout, paywall, bot-block — returns whatever partial info we have.
 */
export async function resolveArticleVisual(
  rssUrl: string,
  opts: { timeoutMs?: number; fetcher?: typeof fetch } = {},
): Promise<ArticleVisual> {
  const doFetch = opts.fetcher ?? fetch;
  const articleUrl = decodeGoogleNewsUrl(rssUrl) ?? (domainOf(rssUrl)?.endsWith('news.google.com') ? null : rssUrl);
  const sourceDomain = domainOf(articleUrl);
  if (!articleUrl) return { imageUrl: null, sourceDomain: null, articleUrl: null };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 4000);
    const res = await doFetch(articleUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // A browsery UA — many publishers serve og tags to anything, but some
        // bot-block plain fetch UAs.
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 VestaBriefing/1.0',
        accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
    });
    clearTimeout(timer);
    if (!res.ok) return { imageUrl: null, sourceDomain, articleUrl };
    const html = await res.text();
    return { imageUrl: extractOgImage(html), sourceDomain: domainOf(res.url) ?? sourceDomain, articleUrl };
  } catch {
    return { imageUrl: null, sourceDomain, articleUrl };
  }
}
