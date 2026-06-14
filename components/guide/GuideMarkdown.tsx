import type { ReactNode } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { GUIDES } from '@/lib/guides/registry';
import { rewriteGuideHref } from '@/lib/guides/markdown';

/**
 * Renders a guide's Markdown body to themed HTML. This is a server component:
 * react-markdown runs at build time and the result is baked into the static
 * page, so none of the markdown machinery ships to the browser. Styling lives in
 * the `.guide-prose` block in globals.css (theme-token driven, both modes);
 * `rehype-slug` stamps GitHub-style ids on headings so the table of contents and
 * `#anchor` links land correctly.
 */

const KNOWN_SLUGS = new Set(GUIDES.map((g) => g.slug));

function Anchor({ href, children }: { href?: string; children?: ReactNode }) {
  const { href: to, external } = rewriteGuideHref(href ?? '', KNOWN_SLUGS);
  if (external) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" data-external>
        {children}
      </a>
    );
  }
  // Internal guide routes get client-side soft navigation; in-page anchors,
  // mailto:, etc. fall through to a plain link.
  if (to.startsWith('/user-guide')) {
    return (
      <Link href={to} prefetch={false}>
        {children}
      </Link>
    );
  }
  return <a href={to}>{children}</a>;
}

export function GuideMarkdown({ body }: { body: string }) {
  return (
    <div className="guide-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSlug]}
        components={{ a: Anchor }}
      >
        {body}
      </ReactMarkdown>
    </div>
  );
}
