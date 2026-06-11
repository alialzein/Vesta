'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Icon } from '@/components/ui/Icon';

/**
 * The three hero-feature "spotlight bands" of the landing page — full-bleed
 * sections where the copy sits beside a live, looping UI mock of the feature:
 *
 *   01 Today's Radar   — rows stagger in, the red OVERDUE item climbs to the top
 *   02 Readable reasons — the AI reason card assembles: summary draws, the score
 *                         dial fills to 87, the next-best-action pill pops
 *   03 Drafts & approval — the draft "types" itself, Approve & Send lights up,
 *                          a paper plane flies off, "Sent" confirms
 *
 * Mocks are pure theme-token DOM (both palettes for free). Their default
 * (no-JS / reduced-motion) state is the COMPLETE state; GSAP timelines reset
 * and replay them only when motion is allowed. Entry reveals (data-reveal /
 * data-stagger) are handled by the LandingPage-level ScrollTrigger pass.
 */

type Props = { reduced: boolean };

const CHIP = 'rounded-full bg-panel-2 px-3 py-[5px] font-mono text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-soft';

/** A skeleton text line (theme-aware). */
function Line({ w, tone = 'bg-panel-2', tall = false, data }: { w: string; tone?: string; tall?: boolean; data?: string }) {
  return (
    <div
      {...(data ? { [`data-${data}`]: 'true' } : {})}
      className={`${tall ? 'h-[10px]' : 'h-[7px]'} ${tone} rounded-full`}
      style={{ width: w, transformOrigin: 'left center' }}
    />
  );
}

export function FeatureSpotlights({ reduced }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reduced) return;
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      /* ---- 01 · radar: rows enter, the overdue row climbs to the top ---- */
      const rows = gsap.utils.toArray<HTMLElement>('[data-mockrow]', root);
      if (rows.length === 4) {
        const SHIFT = 66; // row height 58 + gap 8
        const overdue = rows[2];
        const badge = overdue.querySelector('[data-mockbadge]');
        // Short repeatDelay: the panel should never sit empty for long.
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.4 });
        tl.fromTo(
          rows,
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out', stagger: 0.12 },
        )
          .to(overdue, { y: -SHIFT * 2, duration: 0.65, ease: 'power3.inOut' }, '+=0.9')
          .to([rows[0], rows[1]], { y: SHIFT, duration: 0.65, ease: 'power3.inOut' }, '<');
        if (badge) {
          tl.fromTo(
            badge,
            { scale: 1 },
            { scale: 1.14, duration: 0.22, yoyo: true, repeat: 1, ease: 'power2.inOut' },
            '<0.35',
          );
        }
        tl.to({}, { duration: 1.8 }) // hold the sorted state
          .to(rows, { opacity: 0, y: -12, duration: 0.35, ease: 'power1.in', stagger: 0.05 });
      }

      /* ---- 02 · reasons: card assembles, dial fills to 87, pill pops ---- */
      const reason = root.querySelector<HTMLElement>('[data-mock="reason"]');
      if (reason) {
        const lines = gsap.utils.toArray<HTMLElement>('[data-mockline]', reason);
        const dial = reason.querySelector<SVGCircleElement>('[data-mockdial]');
        const scoreEl = reason.querySelector<HTMLElement>('[data-mockscore]');
        const pill = reason.querySelector<HTMLElement>('[data-mockpill]');
        const score = { v: 0 };
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6 });
        tl.fromTo(
          lines,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.5, ease: 'power2.out', stagger: 0.16 },
        );
        if (dial && scoreEl) {
          tl.fromTo(dial, { strokeDashoffset: 100 }, { strokeDashoffset: 13, duration: 0.9, ease: 'power2.out' }, '-=0.3');
          tl.to(
            score,
            {
              v: 87,
              duration: 0.9,
              ease: 'power2.out',
              onStart: () => {
                score.v = 0;
              },
              onUpdate: () => {
                scoreEl.textContent = String(Math.round(score.v));
              },
            },
            '<',
          );
        }
        if (pill) {
          tl.fromTo(
            pill,
            { opacity: 0, scale: 0.6 },
            { opacity: 1, scale: 1, duration: 0.45, ease: 'back.out(2)' },
            '-=0.2',
          );
        }
        tl.to({}, { duration: 1.8 }).to([...lines, ...(pill ? [pill] : [])], {
          opacity: 0,
          duration: 0.35,
          onComplete: () => {
            gsap.set(lines, { opacity: 1, scaleX: 0 });
          },
        });
        if (dial) tl.to(dial, { strokeDashoffset: 100, duration: 0.35 }, '<');
      }

      /* ---- 03 · drafts: the reply types itself, approval sends the plane ---- */
      const draft = root.querySelector<HTMLElement>('[data-mock="draft"]');
      if (draft) {
        const lines = gsap.utils.toArray<HTMLElement>('[data-mockdraftline]', draft);
        const approve = draft.querySelector<HTMLElement>('[data-mockapprove]');
        const planeEl = draft.querySelector<HTMLElement>('[data-mockplane]');
        const sent = draft.querySelector<HTMLElement>('[data-mocksent]');
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.4 });
        tl.set(sent ?? {}, { opacity: 0 })
          .set(planeEl ?? {}, { x: 0, y: 0, opacity: 0, rotate: 0 })
          .fromTo(
            lines,
            { scaleX: 0 },
            { scaleX: 1, duration: 0.55, ease: 'power1.inOut', stagger: 0.28 },
          );
        if (approve) {
          tl.fromTo(
            approve,
            { boxShadow: '0 0 0 rgba(47,125,235,0)' },
            { boxShadow: '0 8px 26px rgba(47,125,235,0.45)', duration: 0.4 },
            '+=0.5',
          ).to(approve, { scale: 0.96, duration: 0.12, yoyo: true, repeat: 1 });
        }
        if (planeEl) {
          tl.to(planeEl, { opacity: 1, duration: 0.1 }).to(planeEl, {
            x: 130,
            y: -64,
            rotate: -14,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.in',
          });
        }
        if (sent) tl.to(sent, { opacity: 1, duration: 0.4 }, '-=0.2');
        tl.to({}, { duration: 1.6 }).to(lines, { scaleX: 0, duration: 0.3, stagger: 0.04 });
        if (approve) tl.to(approve, { boxShadow: '0 0 0 rgba(47,125,235,0)', duration: 0.3 }, '<');
        if (sent) tl.to(sent, { opacity: 0, duration: 0.25 }, '<'); // leave with the lines
      }
    }, root);

    return () => ctx.revert();
  }, [reduced]);

  return (
    <div ref={rootRef}>
      {/* ------------------------- band 01 · the radar ------------------------- */}
      <section className="border-t border-line bg-bg px-5 py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div data-reveal>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              01 — Today&apos;s Radar
            </p>
            <h3 className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[36px]">
              Start where it matters,
              <br />
              not where the pile starts.
            </h3>
            <p className="mt-4 max-w-[480px] text-[14.5px] leading-relaxed text-ink-soft">
              Open Vesta to a ranked list of the few threads that actually need you. Overdue is
              red and climbs to the top, senders have faces, and one click resolves, snoozes, or
              dismisses. The longer something waits, the louder it gets.
            </p>
            <ul className="mt-6 flex max-w-[480px] flex-wrap gap-2 p-0">
              {['Ranked 0–100', 'Overdue alerts', 'One-click resolve', 'Click a face to filter'].map(
                (c) => (
                  <li key={c} className={CHIP}>
                    {c}
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Radar mock — four rows; the red OVERDUE one climbs to the top. */}
          <div data-reveal className="relative">
            <div
              aria-hidden="true"
              className="rounded-[var(--radius)] border border-line bg-panel p-4 shadow-glow"
            >
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="font-display text-[15px] font-medium tracking-tight">
                  Today&apos;s Radar
                </span>
                <span className="rounded-full bg-panel-2 px-[9px] py-[2px] font-mono text-[10.5px] font-semibold text-muted">
                  4
                </span>
              </div>
              <div className="flex flex-col gap-[8px]">
                {(
                  [
                    ['78', 'bg-amber-soft text-amber', 'JD', false, '64%', 'Due Thu'],
                    ['64', 'bg-green-soft text-green', 'MK', false, '52%', 'Waiting'],
                    ['91', 'bg-red-soft text-red', 'SA', true, '70%', 'Overdue'],
                    ['52', 'bg-green-soft text-green', 'RT', false, '46%', 'Due Fri'],
                  ] as const
                ).map(([score, badgeTone, initials, isOverdue, w, due]) => (
                  <div
                    key={initials}
                    data-mockrow
                    className={`flex h-[58px] items-center gap-3 rounded-[12px] border bg-card px-3 ${
                      isOverdue ? 'border-red/40' : 'border-line'
                    }`}
                  >
                    <span
                      {...(isOverdue ? { 'data-mockbadge': 'true' } : {})}
                      className={`grid h-[32px] w-[34px] flex-none place-items-center rounded-[9px] font-mono text-[12.5px] font-bold ${badgeTone}`}
                    >
                      {score}
                    </span>
                    <span className="grid h-[26px] w-[26px] flex-none place-items-center rounded-full bg-accent-soft font-mono text-[9px] font-bold text-accent">
                      {initials}
                    </span>
                    <div className="flex min-w-0 grow flex-col gap-[6px]">
                      <Line w={w} tall tone="bg-panel-2" />
                      <Line w="38%" />
                    </div>
                    <span
                      className={`flex-none font-mono text-[10.5px] font-semibold ${
                        isOverdue ? 'text-red' : 'text-muted'
                      }`}
                    >
                      {due}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------- band 02 · readable reasons ----------------------- */}
      <section className="border-t border-line bg-panel px-5 py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Reason-card mock — summary draws in, the dial fills, the action pops. */}
          <div data-reveal className="relative lg:order-1">
            <div
              aria-hidden="true"
              className="rounded-[var(--radius)] border border-line bg-bg p-5 shadow-glow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 grow">
                  <p className="m-0 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                    Why this matters
                  </p>
                  <div className="mt-4 flex flex-col gap-[9px]">
                    <Line w="92%" tall data="mockline" />
                    <Line w="78%" tall data="mockline" />
                    <Line w="58%" tall data="mockline" />
                  </div>
                  <p className="mb-0 mt-5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                    Deadline found · Thu 4pm
                  </p>
                  <div className="mt-2 flex flex-col gap-[8px]">
                    <Line w="84%" data="mockline" />
                    <Line w="66%" data="mockline" />
                  </div>
                </div>
                {/* Score dial */}
                <div className="relative grid h-[88px] w-[88px] flex-none place-items-center">
                  <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="var(--line)" strokeWidth="6" />
                    <circle
                      data-mockdial
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray={100}
                      strokeDashoffset={13}
                    />
                  </svg>
                  <span className="absolute inset-0 grid place-items-center font-mono text-[20px] font-bold text-ink">
                    <span data-mockscore>87</span>
                  </span>
                </div>
              </div>
              <div className="mt-5 border-t border-line pt-4">
                <span
                  data-mockpill
                  className="inline-flex items-center gap-[6px] rounded-full bg-accent-soft px-3 py-[6px] text-[12px] font-semibold text-accent"
                >
                  <Icon name="sparkle" className="h-[13px] w-[13px]" />
                  Next best action: confirm the revised date
                </span>
              </div>
            </div>
          </div>

          <div data-reveal className="lg:order-2">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              02 — Readable reasons
            </p>
            <h3 className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[36px]">
              AI that shows its work.
            </h3>
            <p className="mt-4 max-w-[480px] text-[14.5px] leading-relaxed text-ink-soft">
              For every item on the radar, Vesta writes the why in plain words — a summary you can
              skim, the deadline it found in the thread, and the next best action. The score is an
              argument, not a verdict: you can always read where it came from.
            </p>
            <ul className="mt-6 flex max-w-[480px] flex-wrap gap-2 p-0">
              {['Plain-language why', 'Deadline detection', 'Next best action', 'No black boxes'].map(
                (c) => (
                  <li key={c} className={CHIP}>
                    {c}
                  </li>
                ),
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* ----------------------- band 03 · drafts & approval ----------------------- */}
      <section className="border-t border-line bg-bg px-5 py-20 sm:py-24">
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div data-reveal>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              03 — Drafts &amp; approval
            </p>
            <h3 className="mt-3 font-display text-[28px] font-semibold leading-tight tracking-tight sm:text-[36px]">
              Approve, don&apos;t compose.
            </h3>
            <p className="mt-4 max-w-[480px] text-[14.5px] leading-relaxed text-ink-soft">
              Vesta drafts the reply — or the follow-up nudge — in your tone, threaded into the
              real Outlook conversation with the right recipients. You edit if you like, you
              approve, it sends. Nothing ever leaves without you, and every send is audit-logged.
            </p>
            <ul className="mt-6 flex max-w-[480px] flex-wrap gap-2 p-0">
              {['Your tone', 'Follow-up nudges', 'Reply-all & Bcc control', 'Audit-logged sends'].map(
                (c) => (
                  <li key={c} className={CHIP}>
                    {c}
                  </li>
                ),
              )}
            </ul>
          </div>

          {/* Composer mock — the draft types itself; approval launches the plane. */}
          <div data-reveal className="relative">
            <div
              aria-hidden="true"
              data-mock="draft"
              className="relative rounded-[var(--radius)] border border-line bg-panel p-5 shadow-glow"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                  To
                </span>
                <span className="rounded-full bg-panel-2 px-[10px] py-[3px] text-[11.5px] font-semibold text-ink-soft">
                  sarah.chen@northwind.com
                </span>
              </div>
              <div className="mt-3 border-t border-line pt-3">
                <p className="m-0 text-[13px] font-semibold tracking-tight">
                  Re: Q3 vendor contract — revised dates
                </p>
                <div className="mt-4 flex flex-col gap-[9px]">
                  <div data-mockdraftline className="h-[8px] w-[88%] rounded-full bg-panel-2" style={{ transformOrigin: 'left center' }} />
                  <div data-mockdraftline className="h-[8px] w-[94%] rounded-full bg-panel-2" style={{ transformOrigin: 'left center' }} />
                  <div data-mockdraftline className="h-[8px] w-[60%] rounded-full bg-panel-2" style={{ transformOrigin: 'left center' }} />
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <div className="flex gap-[6px]">
                  <span className="rounded-full bg-accent-soft px-[10px] py-[4px] font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-accent">
                    Warm
                  </span>
                  <span className="rounded-full bg-panel-2 px-[10px] py-[4px] font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-muted">
                    Brief
                  </span>
                </div>
                <div className="relative">
                  <span
                    data-mockapprove
                    className="inline-flex items-center gap-[6px] rounded-full bg-gradient-to-br from-accent to-accent-2 px-4 py-[8px] text-[12.5px] font-semibold text-white"
                  >
                    <Icon name="check" className="h-[13px] w-[13px]" />
                    Approve &amp; Send
                  </span>
                  <span
                    data-mockplane
                    className="pointer-events-none absolute -top-1 right-2 text-accent opacity-0"
                  >
                    <Icon name="send" className="h-[18px] w-[18px]" />
                  </span>
                </div>
              </div>
              <p data-mocksent className="m-0 mt-3 text-right font-mono text-[10.5px] font-semibold text-green">
                Sent — threaded into the real conversation ✓
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
