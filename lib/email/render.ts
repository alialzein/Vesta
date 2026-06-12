/**
 * Native rendering for SIMPLE email bodies (pure, unit tested).
 *
 * Plain correspondence ("Hello Ali, … Best regards") doesn't need the white
 * "paper" iframe — that exists because rich/marketing HTML is authored for a
 * light background. Simple bodies read far better as theme-native text (dark
 * text in light mode, light text in dark mode). This module decides which
 * camp a body falls in and extracts the readable text when it's simple;
 * extraction is text-only by construction, so nothing in the email can ever
 * execute or restyle the app (the rich path keeps the sandboxed iframe).
 */

/** Real layout/branding — keep the faithful iframe. (Text colors are fine:
 *  the native render restyles text anyway; backgrounds are not.) Images and a
 *  table or two do NOT make an email rich — that's just a signature block —
 *  but heavy table nesting is a designed layout (newsletters, receipts). */
const RICH_RE = /<\s*(svg|video|picture|object|embed)\b|background(-color)?\s*:/i;
const MAX_SIMPLE_TABLES = 3;

const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
};

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&[a-z]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? m);
}

/** `<a href="u">text</a>` → "text (u)" so links survive the text extraction
 *  (when the text IS the url, it stays a single url). */
function flattenAnchors(html: string): string {
  return html.replace(
    /<a\s[^>]*href="(https?:[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_, href: string, inner: string) => {
      const text = inner.replace(/<[^>]+>/g, '').trim();
      if (!text || text === href) return ` ${href} `;
      return `${text} (${href})`;
    },
  );
}

/**
 * Extract readable text from a simple HTML body, or return null when the
 * body is rich (tables/images/backgrounds) and should keep the iframe.
 */
export function simpleEmailText(html: string): string | null {
  const body = html.replace(/<head[\s\S]*?<\/head>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  if (RICH_RE.test(body)) return null;
  if ((body.match(/<table/gi) ?? []).length > MAX_SIMPLE_TABLES) return null;
  const text = decodeEntities(
    flattenAnchors(body)
      // Signature logos / social icons / tracking pixels add nothing in a
      // text rendering — drop them (an image-ONLY mail ends up empty → iframe).
      .replace(/<img[^>]*>/gi, '')
      .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6]|\/blockquote)[^>]*>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text || null;
}

/** Split text into plain segments and http(s) links for safe linkification
 *  (the caller renders links as real anchors it constructs itself). */
export function linkifySegments(text: string): { type: 'text' | 'link'; value: string }[] {
  const out: { type: 'text' | 'link'; value: string }[] = [];
  const re = /https?:\/\/[^\s<>()\]]+[^\s<>()\].,;:!?]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ type: 'text', value: text.slice(last, idx) });
    out.push({ type: 'link', value: m[0] });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}
