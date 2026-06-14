import { describe, expect, it } from 'vitest';
import { cleanInline, extractToc, rewriteGuideHref, splitTitle } from '@/lib/guides/markdown';

describe('splitTitle', () => {
  it('lifts the leading H1 out of the body', () => {
    const { title, body } = splitTitle('# Getting started\n\nWelcome to Vesta.\n');
    expect(title).toBe('Getting started');
    expect(body).toBe('Welcome to Vesta.\n');
  });

  it('tolerates leading blank lines', () => {
    const { title, body } = splitTitle('\n\n#  Meetings  \n\nYour calendar.');
    expect(title).toBe('Meetings');
    expect(body).toBe('Your calendar.');
  });

  it('returns no title when the file does not start with an H1', () => {
    const { title, body } = splitTitle('Just a paragraph.\n## A heading');
    expect(title).toBeUndefined();
    expect(body).toBe('Just a paragraph.\n## A heading');
  });

  it('cleans inline markdown out of the title', () => {
    const { title } = splitTitle('# **Draft** replies with [approval](x.md)\n');
    expect(title).toBe('Draft replies with approval');
  });
});

describe('extractToc', () => {
  it('collects H2 and H3, skips H1/H4, and slugs the text', () => {
    const md = ['# Title', '## First section', 'body', '### Sub one', '#### too deep', '## Second'].join(
      '\n',
    );
    expect(extractToc(md)).toEqual([
      { id: 'first-section', text: 'First section', level: 2 },
      { id: 'sub-one', text: 'Sub one', level: 3 },
      { id: 'second', text: 'Second', level: 2 },
    ]);
  });

  it('ignores headings inside fenced code blocks', () => {
    const md = ['## Real', '```', '## Not a heading', '```', '## Also real'].join('\n');
    expect(extractToc(md).map((t) => t.text)).toEqual(['Real', 'Also real']);
  });

  it('disambiguates duplicate headings like github-slugger does', () => {
    const md = ['## Setup', '## Setup'].join('\n');
    expect(extractToc(md).map((t) => t.id)).toEqual(['setup', 'setup-1']);
  });

  it('strips inline markdown from the visible label', () => {
    const md = '## The two **gates** of [filtering](email-filtering.md)';
    expect(extractToc(md)[0]).toEqual({
      id: 'the-two-gates-of-filtering',
      text: 'The two gates of filtering',
      level: 2,
    });
  });
});

describe('rewriteGuideHref', () => {
  const known = new Set(['connect-outlook', 'email-filtering']);

  it('rewrites a sibling .md link to the live route', () => {
    expect(rewriteGuideHref('connect-outlook.md', known)).toEqual({
      href: '/user-guide/connect-outlook',
      external: false,
    });
  });

  it('preserves the fragment on a .md link', () => {
    expect(rewriteGuideHref('email-filtering.md#gates', known)).toEqual({
      href: '/user-guide/email-filtering#gates',
      external: false,
    });
  });

  it('sends README.md to the overview', () => {
    expect(rewriteGuideHref('README.md', known).href).toBe('/user-guide');
  });

  it('sends an excluded/unknown .md (e.g. the admin guide) to the overview', () => {
    expect(rewriteGuideHref('admin-panel.md', known).href).toBe('/user-guide');
  });

  it('flags http(s) links as external and leaves them untouched', () => {
    expect(rewriteGuideHref('https://outlook.com', known)).toEqual({
      href: 'https://outlook.com',
      external: true,
    });
  });

  it('leaves in-page anchors and mailto links alone', () => {
    expect(rewriteGuideHref('#staying-signed-in', known)).toEqual({
      href: '#staying-signed-in',
      external: false,
    });
    expect(rewriteGuideHref('mailto:help@vesta.app', known).external).toBe(false);
  });

  it('falls back gracefully on an empty href', () => {
    expect(rewriteGuideHref('', known)).toEqual({ href: '#', external: false });
  });
});

describe('cleanInline', () => {
  it('removes links, code and emphasis', () => {
    expect(cleanInline('see `code`, **bold**, _em_, [x](y.md)')).toBe('see code, bold, em, x');
  });
});
