'use client';

import { useEffect, useState } from 'react';
import { VestaMark } from '@/components/ui/Icon';

/**
 * Vesta Initialization Screen (Phase 0.5 revision).
 *
 * A true full-screen, OPAQUE branded splash — not a transparent overlay. It owns
 * the viewport (high z-index, solid `.vesta-splash` background) so no dashboard
 * content shows through, then fades out into the dashboard.
 *
 * Visual story: "Vesta is organizing signals into order." A luminous core,
 * concentric orbital rings with traveling signal nodes, a slow radar sweep, a
 * faint engineering grid, and staged status copy.
 *
 * Demo-only: a timed splash, not a real data gate. Shown once per browser
 * session (sessionStorage, handled by the parent). Respects reduced motion and
 * is easy to fast-forward in tests via SPLASH_DURATION_MS.
 *
 * See docs/archive/design/loading-experience-v1.md.
 */

/** How long the splash is shown before it begins fading out (demo feel). */
export const SPLASH_DURATION_MS = process.env.NODE_ENV === 'test' ? 0 : 1800;
/** Fade-out duration; must match the .animate-vesta-fade-out keyframe. */
const FADE_MS = 450;

const PHRASES = [
  'Preparing your command center',
  'Organizing today’s signal',
  'Mapping decisions and follow-ups',
  'Aligning priorities',
  'Loading Vesta',
] as const;

export function VestaSplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [phrase, setPhrase] = useState(0);

  // Exit timing.
  useEffect(() => {
    if (SPLASH_DURATION_MS <= 0) {
      onDone();
      return;
    }
    const startFade = window.setTimeout(() => setLeaving(true), SPLASH_DURATION_MS);
    const finish = window.setTimeout(onDone, SPLASH_DURATION_MS + FADE_MS);
    return () => {
      window.clearTimeout(startFade);
      window.clearTimeout(finish);
    };
  }, [onDone]);

  // Rotate the staged copy.
  useEffect(() => {
    if (SPLASH_DURATION_MS <= 0) return;
    const step = Math.max(420, Math.floor(SPLASH_DURATION_MS / PHRASES.length));
    const id = window.setInterval(() => {
      setPhrase((p) => (p + 1 < PHRASES.length ? p + 1 : p));
    }, step);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div
      data-testid="vesta-splash-screen"
      role="status"
      aria-label="Loading Vesta"
      className={[
        'vesta-splash fixed inset-0 z-[300] grid place-items-center overflow-hidden',
        leaving ? 'animate-vesta-fade-out' : '',
      ].join(' ')}
      style={{ ['--splash-ms' as string]: `${SPLASH_DURATION_MS}ms` }}
    >
      {/* Faint engineering grid, masked to a soft vignette. */}
      <span className="vesta-splash-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative flex flex-col items-center gap-[40px] px-6">
        {/* ----- Signal system ----- */}
        <div
          data-testid="vesta-splash-core"
          className="relative grid h-[min(72vw,300px)] w-[min(72vw,300px)] place-items-center"
        >
          {/* Soft radial field behind the whole system (depth). */}
          <span
            className="absolute -inset-[36%] rounded-full bg-[radial-gradient(circle,rgba(67,199,255,0.12),transparent_60%)] blur-[18px]"
            aria-hidden="true"
          />
          {/* Outer halo bloom */}
          <span
            className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(91,168,245,0.32),transparent_66%)] blur-[6px]"
            aria-hidden="true"
          />

          {/* Outermost ring + traveling nodes */}
          <span
            className="animate-vesta-orbit-slow absolute inset-0 rounded-full border border-[rgba(140,196,255,0.16)]"
            aria-hidden="true"
          >
            <span className="absolute left-1/2 top-0 h-[6px] w-[6px] -translate-x-1/2 rounded-full bg-[#67e8d8] shadow-[0_0_12px_3px_rgba(103,232,216,0.7)]" />
            <span className="absolute bottom-[14%] right-[8%] h-[4px] w-[4px] rounded-full bg-[#9fd2ff] shadow-[0_0_10px_2px_rgba(159,210,255,0.7)]" />
          </span>

          {/* Middle ring (counter-rotating) + nodes */}
          <span
            className="animate-vesta-orbit-rev absolute inset-[34px] rounded-full border border-[rgba(140,196,255,0.22)]"
            aria-hidden="true"
          >
            <span className="absolute bottom-0 left-1/2 h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-[#5ba8f5] shadow-[0_0_12px_3px_rgba(91,168,245,0.75)]" />
            <span className="absolute left-[6%] top-[30%] h-[4px] w-[4px] rounded-full bg-[#9fd2ff] shadow-[0_0_8px_2px_rgba(159,210,255,0.7)]" />
          </span>

          {/* Inner ring + nodes */}
          <span
            className="animate-vesta-orbit absolute inset-[66px] rounded-full border border-[rgba(140,196,255,0.28)]"
            aria-hidden="true"
          >
            <span className="absolute right-0 top-1/2 h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-[#67e8d8] shadow-[0_0_10px_2px_rgba(103,232,216,0.7)]" />
            <span className="absolute left-[14%] top-[12%] h-[4px] w-[4px] rounded-full bg-[#5ba8f5] shadow-[0_0_8px_2px_rgba(91,168,245,0.7)]" />
          </span>

          {/* Radar sweep wedge */}
          <span
            className="animate-vesta-sweep absolute inset-[24px] rounded-full bg-[conic-gradient(from_0deg,rgba(91,168,245,0.28),transparent_30%)]"
            aria-hidden="true"
          />

          {/* Breathing luminous core with the Vesta mark */}
          <span
            className="animate-vesta-breathe relative grid h-[86px] w-[86px] place-items-center rounded-full bg-[radial-gradient(circle_at_32%_26%,#7cc0ff,#2f7deb_70%)] text-white shadow-[0_0_46px_10px_rgba(91,168,245,0.5)]"
            aria-hidden="true"
          >
            <VestaMark className="h-[40px] w-[40px]" />
          </span>
        </div>

        {/* ----- Copy ----- */}
        <div className="flex flex-col items-center gap-[14px] text-center">
          {/* Small live "signal" equalizer above the wordmark. */}
          <span className="flex items-end gap-[3px]" aria-hidden="true">
            {[10, 16, 7, 13, 9].map((h, i) => (
              <span
                key={i}
                className="animate-vesta-pulse w-[2px] rounded-full bg-gradient-to-t from-[#5ba8f5] to-[#67e8d8]"
                style={{ height: `${h}px`, animationDelay: `${i * -0.32}s` }}
              />
            ))}
          </span>

          <span className="font-display text-[34px] font-semibold leading-none tracking-tight text-[color:var(--splash-ink)] [text-shadow:0_0_26px_rgba(91,168,245,0.45)]">
            Vesta
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.34em] text-[color:var(--splash-tagline)]">
            Your work, in order
          </span>

          <p
            data-testid="vesta-splash-message"
            key={phrase}
            className="animate-vesta-fade-in m-0 mt-[4px] min-h-[18px] text-[14px] font-medium tracking-tight text-[color:var(--splash-msg)]"
            aria-live="polite"
          >
            {PHRASES[phrase]}
          </p>

          {/* Progress bar — branded cyan→mint with a soft glow. */}
          <span
            className="relative mt-[8px] h-[3px] w-[188px] overflow-hidden rounded-full bg-[rgba(140,196,255,0.16)]"
            aria-hidden="true"
          >
            <span className="animate-vesta-progress block h-full w-full rounded-full bg-gradient-to-r from-[#5ba8f5] via-[#54cfe6] to-[#67e8d8] shadow-[0_0_10px_1px_rgba(103,232,216,0.5)]" />
          </span>
        </div>
      </div>
    </div>
  );
}
