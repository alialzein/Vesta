import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/ui/Icon';
import { DocsShell } from '@/components/guide/DocsShell';
import { GuideMarkdown } from '@/components/guide/GuideMarkdown';
import {
  GUIDES,
  getGroup,
  getGuideMeta,
  guidesByGroup,
  neighbours,
} from '@/lib/guides/registry';
import { loadGuide } from '@/lib/guides/load';

/**
 * The public user guide at `/user-guide` (overview) and `/user-guide/<slug>`
 * (one guide). Fully statically generated from the Markdown in docs/guides —
 * the fs read happens at build, so the deployed route is just static HTML.
 * Made public in lib/supabase/middleware.ts so signed-out visitors can read it.
 */

// Only the slugs we enumerate below exist; anything else 404s.
export const dynamicParams = false;

export function generateStaticParams(): { slug: string[] }[] {
  return [{ slug: [] }, ...GUIDES.map((g) => ({ slug: [g.slug] }))];
}

function slugFrom(params: { slug?: string[] }): string | null {
  const seg = params.slug;
  if (!seg || seg.length === 0) return null; // overview
  if (seg.length > 1) notFound();
  return seg[0];
}

export async function generateMetadata({
  params,
}: {
  params: { slug?: string[] };
}): Promise<Metadata> {
  const slug = params.slug && params.slug.length > 0 ? params.slug[0] : null;
  if (!slug) {
    return {
      title: 'Vesta User Guide',
      description:
        'Plain-language guides for Vesta — how to sign in, connect Outlook, read your radar, and let Vesta draft replies. No jargon.',
    };
  }
  const meta = getGuideMeta(slug);
  if (!meta) return { title: 'Vesta User Guide' };
  return { title: `${meta.title} — Vesta User Guide`, description: meta.blurb };
}

export default async function UserGuidePage({ params }: { params: { slug?: string[] } }) {
  const slug = slugFrom(params);

  if (!slug) {
    return (
      <DocsShell activeSlug={null} toc={[]}>
        <Overview />
      </DocsShell>
    );
  }

  const guide = await loadGuide(slug);
  if (!guide) notFound();

  const group = getGroup(guide.meta.group);
  const { prev, next } = neighbours(slug);

  return (
    <DocsShell activeSlug={slug} toc={guide.toc}>
      <header className="mb-8">
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-2 text-[12px] text-muted">
          <Link href="/user-guide" prefetch className="transition hover:text-accent">
            User guide
          </Link>
          {group && (
            <>
              <Icon name="chevronRight" className="h-3 w-3" />
              <span>{group.title}</span>
            </>
          )}
        </nav>
        <h1 className="font-display text-[30px] font-semibold leading-tight tracking-tight sm:text-[38px]">
          {guide.title}
        </h1>
        <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-ink-soft">
          {guide.meta.blurb}
        </p>
      </header>

      <GuideMarkdown body={guide.body} />

      {/* Previous / next in reading order. */}
      <nav
        aria-label="More guides"
        className="mt-12 grid grid-cols-1 gap-3 border-t border-line pt-6 sm:grid-cols-2"
      >
        {prev ? (
          <Link
            href={`/user-guide/${prev.slug}`}
            prefetch
            className="group flex flex-col rounded-[14px] border border-line bg-panel p-4 shadow-soft transition hover:border-accent"
          >
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              <Icon name="chevronLeft" className="h-3 w-3" /> Previous
            </span>
            <span className="mt-1.5 font-display text-[15px] font-semibold tracking-tight text-ink transition group-hover:text-accent">
              {prev.title}
            </span>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link
            href={`/user-guide/${next.slug}`}
            prefetch
            className="group flex flex-col rounded-[14px] border border-line bg-panel p-4 text-right shadow-soft transition hover:border-accent sm:items-end"
          >
            <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
              Next <Icon name="chevronRight" className="h-3 w-3" />
            </span>
            <span className="mt-1.5 font-display text-[15px] font-semibold tracking-tight text-ink transition group-hover:text-accent">
              {next.title}
            </span>
          </Link>
        )}
      </nav>
    </DocsShell>
  );
}

/** The `/user-guide` landing: hero + every guide grouped into cards. */
function Overview() {
  const groups = guidesByGroup();
  const first = GUIDES[0];
  return (
    <div>
      <header className="mb-10">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
          User guide
        </p>
        <h1 className="mt-3 font-display text-[34px] font-semibold leading-tight tracking-tight sm:text-[46px]">
          Everything Vesta can do,
          <br />
          in plain words.
        </h1>
        <p className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-ink-soft">
          Short, jargon-free guides written from your point of view — what each feature does, what
          you&apos;ll see on screen, and how to control it. New to Vesta? Start at the top and work
          down.
        </p>
        <div className="mt-6">
          <Link
            href={`/user-guide/${first.slug}`}
            prefetch
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-accent to-accent-2 px-5 py-[11px] text-[14px] font-semibold text-white shadow-[0_10px_28px_rgba(47,125,235,0.34)] transition hover:brightness-110"
          >
            Start here — {first.title}
            <Icon name="arrow" className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <div className="space-y-12">
        {groups.map(({ group, guides }) => (
          <section key={group.id} aria-labelledby={`grp-${group.id}`}>
            <div className="mb-4">
              <h2
                id={`grp-${group.id}`}
                className="font-display text-[20px] font-semibold tracking-tight"
              >
                {group.title}
              </h2>
              <p className="mt-1 text-[13px] text-muted">{group.blurb}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {guides.map((g) => (
                <Link
                  key={g.slug}
                  href={`/user-guide/${g.slug}`}
                  prefetch
                  className="group flex items-start gap-3.5 rounded-[16px] border border-line bg-panel p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-accent"
                >
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-[12px] bg-accent-soft text-accent">
                    <Icon name={g.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display text-[15px] font-semibold tracking-tight text-ink transition group-hover:text-accent">
                      {g.title}
                    </span>
                    <span className="mt-1 block text-[13px] leading-snug text-muted">{g.blurb}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
