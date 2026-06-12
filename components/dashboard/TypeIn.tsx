'use client';

import { Fragment, useEffect, useState } from 'react';

/**
 * Word-by-word reveal for AI-written text (declutter PR 3 — the brief "writes
 * itself in" when Vesta's words land). The FIRST render is always instant
 * (cached briefs, reloads — no churn); the animation plays only when the text
 * CHANGES while mounted, i.e. the moment the deterministic brief becomes the
 * AI one. The full text is in the DOM from the first frame (each word animates
 * opacity/position via CSS), so screen readers and tests see it immediately;
 * reduced motion disables the keyframe in globals.css.
 */
export function TypeIn({ text, className }: { text: string; className?: string }) {
  const [state, setState] = useState({ text, animate: false });

  useEffect(() => {
    setState((s) => (s.text === text ? s : { text, animate: true }));
  }, [text]);

  if (!state.animate) return <span className={className}>{state.text}</span>;

  const words = state.text.split(/\s+/).filter(Boolean);
  return (
    // Keyed by text so a second change replays cleanly.
    <span className={className} key={state.text}>
      {words.map((w, i) => (
        <Fragment key={`${i}-${w}`}>
          <span
            className="vesta-word-in inline-block"
            style={{ animationDelay: `${Math.min(i * 30, 750)}ms` }}
          >
            {w}
          </span>
          {/* The space lives BETWEEN the inline-block words (a trailing space
              inside one would be trimmed by the line box). */}
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  );
}
