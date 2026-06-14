import 'server-only';
import { cache } from 'react';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getGuideMeta, type GuideMeta } from './registry';
import { splitTitle, extractToc, type TocItem } from './markdown';

/**
 * Reads a public guide's Markdown from `docs/guides/<slug>.md` and prepares it
 * for rendering. The route is statically generated (see the page's
 * `generateStaticParams`), so this fs read runs at BUILD time — the deployed
 * function never needs the docs/ folder. `next.config.mjs` still traces the
 * folder into the bundle as a belt-and-suspenders for any dynamic render.
 *
 * Only slugs present in the registry are loadable, so the operator-only admin
 * guide and the folder README can never be served here.
 */

const GUIDES_DIR = path.join(process.cwd(), 'docs', 'guides');

export type LoadedGuide = {
  meta: GuideMeta;
  /** The in-file H1, the authoritative on-page title. */
  title: string;
  /** Markdown body with the leading H1 removed. */
  body: string;
  toc: TocItem[];
};

export const loadGuide = cache(async (slug: string): Promise<LoadedGuide | null> => {
  const meta = getGuideMeta(slug);
  if (!meta) return null;
  let raw: string;
  try {
    raw = await readFile(path.join(GUIDES_DIR, `${slug}.md`), 'utf8');
  } catch {
    return null;
  }
  const { title, body } = splitTitle(raw);
  return { meta, title: title ?? meta.title, body, toc: extractToc(raw) };
});
