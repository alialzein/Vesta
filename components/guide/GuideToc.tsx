'use client';

import { useEffect, useState } from 'react';
import type { TocItem } from '@/lib/guides/markdown';

/**
 * "On this page" table of contents with a live scroll-spy — the heading nearest
 * the top of the reading pane is highlighted as you scroll. Clicking scrolls
 * smoothly within the docs scroll pane (the article lives in a nested scroller,
 * so we drive scrollIntoView ourselves rather than rely on hash jumps).
 * Honors prefers-reduced-motion. Theme-aware via tokens.
 */
export function GuideToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState('');

  useEffect(() => {
    if (items.length === 0) return;
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '0px 0px -68% 0px', threshold: [0, 1] },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  function go(e: React.MouseEvent, id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    setActive(id);
    history.replaceState(null, '', `#${id}`);
  }

  return (
    <nav aria-label="On this page" className="text-[12.5px]">
      <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
        On this page
      </p>
      <ul className="m-0 list-none space-y-1 border-l border-line p-0">
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => go(e, item.id)}
                className={[
                  '-ml-px block border-l-2 py-1 transition-colors',
                  item.level === 3 ? 'pl-6' : 'pl-3',
                  isActive
                    ? 'border-accent font-medium text-accent'
                    : 'border-transparent text-ink-soft hover:text-ink',
                ].join(' ')}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
