'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * The glow thread (declutter PR 3) — a luminous accent line GSAP-draws from
 * the brief's "Start here" row to that item's card on the radar, so Vesta
 * visibly POINTS at the work instead of just naming it.
 *
 * Plays when `playKey` increments (hovering Start-here; once when the AI brief
 * first lands with a focus pick), then fades out. Fixed full-viewport SVG,
 * pointer-events none, colors from theme tokens (both themes). Endpoints are
 * measured at play time; any scroll/resize while visible just fades it out
 * (cheaper and calmer than re-routing a live line). Reduced motion: never
 * drawn. The dashboard loads this lazily so GSAP stays out of the first paint.
 */
export function FocusThread({
  playKey,
  fromEl,
  targetId,
}: {
  /** Increment to (re)play. 0 = never played. */
  playKey: number;
  /** The "Start here" row element (anchor of the thread). */
  fromEl: HTMLElement | null;
  /** Work item id of the focus card (looked up via data-work-item-id). */
  targetId: string | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (playKey === 0 || !fromEl || !targetId) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const svg = svgRef.current;
    const path = pathRef.current;
    const target = document.querySelector<HTMLElement>(
      `[data-work-item-id="${CSS.escape(targetId)}"]`,
    );
    if (!svg || !path || !target) return;

    // Anchor at the arrow chip of the Start-here row; land on the card's left
    // edge, vertically centered — a soft S-curve between them.
    const a = fromEl.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    if (b.top < 0 || b.bottom > window.innerHeight) return; // card off-screen: nothing to point at
    const x1 = a.left + 22;
    const y1 = a.bottom - 4;
    const x2 = b.left + 4;
    const y2 = b.top + b.height / 2;
    const midY = y1 + (y2 - y1) * 0.55;
    path.setAttribute('d', `M ${x1} ${y1} C ${x1 - 14} ${midY}, ${x2 - 36} ${midY}, ${x2} ${y2}`);

    const len = path.getTotalLength();
    gsap.set(svg, { autoAlpha: 1 });
    gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    const tl = gsap.timeline();
    tl.to(path, { strokeDashoffset: 0, duration: 0.65, ease: 'power2.out' }).to(
      svg,
      { autoAlpha: 0, duration: 0.45 },
      '+=0.7',
    );

    const hide = () => gsap.to(svg, { autoAlpha: 0, duration: 0.15, overwrite: true });
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      tl.kill();
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
      gsap.set(svg, { autoAlpha: 0 });
    };
  }, [playKey, fromEl, targetId]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] h-full w-full opacity-0"
    >
      <defs>
        <linearGradient id="vesta-thread-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <path
        ref={pathRef}
        fill="none"
        stroke="url(#vesta-thread-grad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        style={{ filter: 'drop-shadow(0 0 6px var(--accent-soft))' }}
      />
    </svg>
  );
}
