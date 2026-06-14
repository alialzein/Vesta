import GithubSlugger from 'github-slugger';

/**
 * Pure Markdown helpers for the user-guide site. No fs, no React — just string
 * work — so they unit-test directly and run on both server and client.
 *
 * Heading ids here are produced with `github-slugger`, the SAME library
 * `rehype-slug` uses when it stamps ids onto the rendered headings. That keeps
 * the table-of-contents anchors (built here, from the raw Markdown) in lockstep
 * with the actual `id`s in the DOM, including duplicate-heading disambiguation.
 */

export type TocItem = { id: string; text: string; level: 2 | 3 };

/** Strip the inline Markdown syntax from heading text so the visible TOC label
 *  (and the slug we hash) matches the rendered text content of the heading. */
export function cleanInline(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images -> alt
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // links -> label
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/__([^_]+)__/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

const FENCE = /^\s*(```|~~~)/;
const H1 = /^#\s+(.+?)\s*#*\s*$/;
const H23 = /^(#{2,3})\s+(.+?)\s*#*\s*$/;

/**
 * Pull the leading `# Title` out of a guide and return it separately from the
 * body, so the page renders the title once (in its styled header) instead of a
 * duplicate H1 inside the prose. Falls back to no title if the file does not
 * start with an H1.
 */
export function splitTitle(md: string): { title?: string; body: string } {
  const lines = md.split(/\r?\n/);
  let i = 0;
  // Skip any leading blank lines.
  while (i < lines.length && lines[i].trim() === '') i++;
  const m = lines[i]?.match(H1);
  if (!m) return { body: md };
  const title = cleanInline(m[1]);
  // Drop the H1 line and a single trailing blank line after it.
  lines.splice(i, 1);
  if (lines[i]?.trim() === '') lines.splice(i, 1);
  return { title, body: lines.join('\n').replace(/^\n+/, '') };
}

/** Extract the H2/H3 headings for the on-page table of contents. Headings
 *  inside fenced code blocks (e.g. the ASCII pipeline diagrams) are ignored. */
export function extractToc(md: string): TocItem[] {
  const slugger = new GithubSlugger();
  const out: TocItem[] = [];
  let inFence = false;
  for (const line of md.split(/\r?\n/)) {
    if (FENCE.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(H23);
    if (!m) continue;
    const text = cleanInline(m[2]);
    if (!text) continue;
    out.push({ id: slugger.slug(text), text, level: m[1].length as 2 | 3 });
  }
  return out;
}

export type RewrittenHref = { href: string; external: boolean };

/**
 * Rewrite a link found inside a guide for the live site:
 *  - `other-guide.md` / `other-guide.md#frag` -> `/user-guide/other-guide[#frag]`
 *  - `README.md` -> `/user-guide` (the overview)
 *  - a `.md` target that is not a public guide -> `/user-guide` (e.g. the
 *    operator-only admin guide, which never ships to the public site)
 *  - `http(s)://…` -> unchanged, flagged external (open in a new tab)
 *  - `#anchor`, `mailto:…`, and anything else -> unchanged, not external
 */
export function rewriteGuideHref(href: string, knownSlugs: Set<string>): RewrittenHref {
  const raw = (href ?? '').trim();
  if (!raw) return { href: '#', external: false };
  if (/^https?:\/\//i.test(raw)) return { href: raw, external: true };
  if (raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) {
    return { href: raw, external: false };
  }
  const [path, frag] = raw.split('#');
  if (/\.md$/i.test(path)) {
    const base = path.replace(/\.md$/i, '');
    const slug = base.split('/').pop() ?? '';
    let target = '/user-guide';
    if (slug && slug.toLowerCase() !== 'readme' && knownSlugs.has(slug)) {
      target = `/user-guide/${slug}`;
    }
    return { href: frag ? `${target}#${frag}` : target, external: false };
  }
  return { href: raw, external: false };
}
