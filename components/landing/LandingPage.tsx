'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useTheme } from '@/lib/theme';
import { Icon, type IconName } from '@/components/ui/Icon';
import { FeatureSpotlights } from './FeatureSpotlights';
import type { VestaSceneHandle } from './VestaScene';

// WebGL only exists in the browser — load the scene client-side, with a calm
// theme-tinted placeholder while the chunk arrives.
const VestaScene = dynamic(() => import('./VestaScene').then((m) => m.VestaScene), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-bg" aria-hidden="true" />,
});

/**
 * Public marketing landing (signed-out visitors). A scroll-driven 3D story —
 * "the journey of one email through Vesta" — followed by classic landing
 * sections. Scrolling is owned by an inner container (the app body is
 * overflow:hidden), the canvas is CSS-sticky inside a tall story section, and
 * GSAP ScrollTrigger (scrub) maps scroll → scene progress + the active step.
 * Both themes; honors prefers-reduced-motion (static scene, no pinning tricks).
 */

const STORY_VH = 600; // height of the pinned story, in viewport-heights (6 beats)

const FINALE_LETTERS = ['V', 'E', 'S', 'T', 'A'] as const;

type Step = { n: string; title: string; body: string };

const STEPS: Step[] = [
  {
    n: '01',
    title: 'One connection',
    body: 'Sign in and connect Outlook once. Vesta syncs new mail silently in the background — no imports, no rituals, nothing to maintain.',
  },
  {
    n: '02',
    title: 'Noise never reaches you',
    body: 'Newsletters, bots, and broadcasts are diverted into a reviewable Hidden tray before they cost you a glance. Only real correspondence moves on.',
  },
  {
    n: '03',
    title: 'AI that shows its work',
    body: 'Vesta reads each thread, scores it 0–100, finds the deadline, and writes the why in plain words. Reasoning you can read — never a black box.',
  },
  {
    n: '04',
    title: 'A radar, not an inbox',
    body: 'Everything that needs you, ranked — who is waiting, what is overdue, what to do next. One glance instead of an excavation.',
  },
  {
    n: '05',
    title: 'Reply with one approval',
    body: 'Vesta drafts replies and follow-up nudges in your tone, threaded into the real conversation. Nothing sends until you approve.',
  },
  {
    n: '06',
    title: 'It keeps working',
    body: 'After you hit send, Vesta tracks who owes you an answer, applies the memory and rules you teach it, and watches your tasks and brief — decisions and Teams are next.',
  },
];

/** Map story progress (0..1) to the active step index (-1 = hero).
 *  Boundaries sit midway between the stations the camera rides past
 *  (envelope ≈ .07, gate ≈ .24, AI core ≈ .42, radar ≈ .59, antenna ≈ .77,
 *  fan-out finale ≈ .85+ of raw progress). */
function stepAt(p: number): number {
  if (p < 0.05) return -1;
  if (p < 0.16) return 0;
  if (p < 0.33) return 1;
  if (p < 0.505) return 2;
  if (p < 0.68) return 3;
  if (p < 0.83) return 4;
  return 5;
}

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'brain',
    title: 'Memory & Rules',
    body: 'Teach Vesta once — VIPs, tone, delegation, hard limits. Every ranking and every draft applies it, and nothing Vesta suggests is saved without your approval.',
  },
  {
    icon: 'refresh',
    title: '“Waiting on them” tracking',
    body: 'When your reply asks for something, Vesta keeps the thread on the radar until they answer — the longer the silence, the higher it climbs.',
  },
  {
    icon: 'shield',
    title: 'Noise, quarantined',
    body: 'Two filtering gates keep newsletters, bots, and broadcasts away from your attention — reviewable any time in the Hidden tray.',
  },
  {
    icon: 'plus',
    title: 'Tasks in plain words',
    body: '“Call the vendor tomorrow 3pm” becomes a scheduled radar item. The ✨ button reads even messier notes.',
  },
  {
    icon: 'sun',
    title: 'Daily Brief & Focus Mode',
    body: 'An AI-written morning brief — what needs you, what to start with and why — then Clear My Day walks you through it, one item at a time.',
  },
  {
    icon: 'people',
    title: 'Senders with faces',
    body: 'Every card shows who is asking. Click a face to see everything that person is waiting on — and clear it in one pass.',
  },
  {
    icon: 'snooze',
    title: 'Snooze, done & resurface',
    body: 'Done means done — until they reply. Snoozed items return exactly when due. Nothing silently disappears.',
  },
  {
    icon: 'trend',
    title: 'Weekly Review',
    body: 'Your week at a glance — what you finished, the replies you sent, and which senders took your attention.',
  },
  {
    icon: 'search',
    title: 'Personal Briefing',
    body: 'Daily intelligence from YOUR topics — clients, competitors, regulations — each item with why it matters and a suggested move.',
  },
  {
    icon: 'calendar',
    title: 'Meetings & calendar',
    body: 'Your real Outlook schedule — week grid with a live now-line, month view, or agenda — with one-tap Join and Prep with Vesta: a one-page brief drawn from the attendees’ own email history.',
  },
  {
    icon: 'chat',
    title: 'Ask Vesta',
    body: 'A second brain that takes orders. It answers from your inbox, memory, briefing, and calendar, learns you with every conversation — and can mark items done, snooze, add tasks, draft replies, schedule reminder emails, even set up meetings. Every action waits for your Confirm.',
  },
];

const ROADMAP: { title: string; body: string }[] = [
  {
    title: 'AI Decision Desk',
    body: 'Pending decisions distilled to options, stakes, and a recommendation you can challenge.',
  },
  {
    title: 'Microsoft Teams',
    body: 'The same radar, reading Teams — mentions, asks, and promises, not just email.',
  },
];

const SAFETY: { icon: IconName; text: string }[] = [
  { icon: 'shield', text: 'Nothing is ever sent without your explicit approval.' },
  { icon: 'check', text: 'Every send and admin action lands in an audit log.' },
  { icon: 'brain', text: 'AI reasoning is always user-visible — never hidden.' },
  { icon: 'people', text: 'Your mailbox data is scoped to you alone.' },
];

export function LandingPage() {
  const { theme, toggleTheme } = useTheme();
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const storyRef = useRef<HTMLDivElement | null>(null);
  const heroRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<VestaSceneHandle | null>(null);
  const progressRef = useRef(0); // latest story progress, replayed when the scene loads
  const finaleRef = useRef<HTMLElement | null>(null);
  const [activeStep, setActiveStep] = useState(-1);
  const [pastStory, setPastStory] = useState(false); // header gains a backdrop in the content half
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const story = storyRef.current;
    if (!scroller || !story) return;
    gsap.registerPlugin(ScrollTrigger);

    const triggers: ScrollTrigger[] = [];

    // The story: scroll position inside the tall section drives the 3D scene
    // and the active step. The canvas pins itself via CSS position:sticky.
    triggers.push(
      ScrollTrigger.create({
        trigger: story,
        scroller,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate(self) {
          progressRef.current = self.progress;
          sceneRef.current?.setProgress(self.progress);
          setActiveStep(stepAt(self.progress));
          if (heroRef.current) {
            // The hero headline yields to the story as scrolling begins.
            const fade = Math.min(1, self.progress / 0.07);
            heroRef.current.style.opacity = String(1 - fade);
            heroRef.current.style.transform = `translateY(${fade * -28}px)`;
            heroRef.current.style.pointerEvents = fade > 0.6 ? 'none' : 'auto';
          }
        },
      }),
    );

    // The floating header gains a backdrop once the story yields to content.
    const onScroll = () => {
      setPastStory(
        scroller.scrollTop > story.offsetTop + story.offsetHeight - window.innerHeight * 1.05,
      );
    };
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });

    const killables: { kill: () => void }[] = [];

    if (!reduced) {
      // Single elements rise in as they enter the viewport.
      gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
        const tween = gsap.fromTo(
          el,
          { opacity: 0, y: 28 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, scroller, start: 'top 88%' },
          },
        );
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      });

      // Grids cascade: children stagger in one after another.
      gsap.utils.toArray<HTMLElement>('[data-stagger]').forEach((group) => {
        const items = Array.from(group.children) as HTMLElement[];
        if (!items.length) return;
        const tween = gsap.fromTo(
          items,
          { opacity: 0, y: 34, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            ease: 'power2.out',
            stagger: 0.09,
            scrollTrigger: { trigger: group, scroller, start: 'top 85%' },
          },
        );
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      });

      // Section headings drift slightly against the scroll for depth.
      gsap.utils.toArray<HTMLElement>('[data-parallax]').forEach((el) => {
        const tween = gsap.fromTo(
          el,
          { y: 36 },
          {
            y: -24,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              scroller,
              scrub: true,
              start: 'top bottom',
              end: 'bottom top',
            },
          },
        );
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      });

      // Connector lines draw themselves across — the path language continued
      // (the 3-step section and the roadmap strip both use one).
      gsap.utils.toArray<HTMLElement>('[data-drawline]').forEach((el) => {
        const tween = gsap.to(el, {
          clipPath: 'inset(0 0% 0 0)',
          ease: 'none',
          scrollTrigger: {
            trigger: el,
            scroller,
            scrub: true,
            start: 'top 92%',
            end: 'top 50%',
          },
        });
        if (tween.scrollTrigger) triggers.push(tween.scrollTrigger);
      });

      // Feature cards open like envelopes: a clip-path unfold from the icon
      // corner with a rising stagger, then the icon chip pops in.
      gsap.utils.toArray<HTMLElement>('[data-cardgrid]').forEach((group) => {
        const cards = Array.from(group.children) as HTMLElement[];
        if (!cards.length) return;
        const open = gsap.fromTo(
          cards,
          { opacity: 0, y: 30, clipPath: 'inset(10% 60% 60% 10% round 18px)' },
          {
            opacity: 1,
            y: 0,
            clipPath: 'inset(0% 0% 0% 0% round 18px)',
            duration: 0.75,
            ease: 'power3.out',
            stagger: 0.1,
            scrollTrigger: { trigger: group, scroller, start: 'top 85%' },
          },
        );
        if (open.scrollTrigger) triggers.push(open.scrollTrigger);
        const icons = cards
          .map((c) => c.querySelector<HTMLElement>('[data-cardicon]'))
          .filter((el): el is HTMLElement => !!el);
        if (icons.length) {
          const pop = gsap.fromTo(
            icons,
            { scale: 0.35, rotate: -14, opacity: 0 },
            {
              scale: 1,
              rotate: 0,
              opacity: 1,
              duration: 0.55,
              ease: 'back.out(2.2)',
              stagger: 0.1,
              delay: 0.25,
              scrollTrigger: { trigger: group, scroller, start: 'top 85%' },
            },
          );
          if (pop.scrollTrigger) triggers.push(pop.scrollTrigger);
        }
      });

      // Finale: the glowing line arrives from above and draws the giant VESTA
      // stroke by stroke as the last screens scroll in; then the letters fill.
      const finale = finaleRef.current;
      if (finale) {
        const lead = finale.querySelector<SVGPathElement>('[data-lead]');
        const strokes = Array.from(finale.querySelectorAll<SVGTextElement>('[data-stroke]'));
        const fills = Array.from(finale.querySelectorAll<SVGTextElement>('[data-fill]'));
        const tl = gsap.timeline({
          scrollTrigger: { trigger: finale, scroller, scrub: true, start: 'top 88%', end: 'bottom 100%' },
        });
        if (lead) tl.to(lead, { strokeDashoffset: 0, duration: 0.5, ease: 'none' });
        strokes.forEach((s, i) => {
          tl.to(s, { strokeDashoffset: 0, duration: 1.6, ease: 'none' }, i === 0 ? '>' : '<0.45');
        });
        if (fills.length) tl.to(fills, { opacity: 1, duration: 1.0, stagger: 0.12, ease: 'none' }, '-=0.8');
        killables.push(tl);
        const st = (tl as { scrollTrigger?: ScrollTrigger }).scrollTrigger;
        if (st) triggers.push(st);
      }
    }

    return () => {
      scroller.removeEventListener('scroll', onScroll);
      triggers.forEach((t) => t.kill());
      killables.forEach((k) => k.kill());
    };
  }, [reduced]);

  function scrollToStory() {
    scrollerRef.current?.scrollTo({
      top: window.innerHeight * 0.9,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }

  return (
    <div
      ref={scrollerRef}
      className="v-scroll relative h-screen overflow-y-auto overflow-x-hidden bg-bg text-ink"
    >
      {/* --------------------------- floating nav --------------------------- */}
      {/* No bar: the wordmark and pills float over the scene. A translucent
          backdrop fades in only once the story yields to the content half. */}
      <header className="pointer-events-none sticky top-0 z-50">
        <div
          className={[
            'transition-[background-color,box-shadow] duration-500',
            pastStory ? 'shadow-soft backdrop-blur-md' : '',
          ].join(' ')}
          style={
            pastStory
              ? { backgroundColor: 'color-mix(in srgb, var(--bg) 78%, transparent)' }
              : undefined
          }
        >
          <nav className="pointer-events-auto mx-auto flex h-[68px] max-w-[1280px] items-center gap-3 px-5 sm:px-7">
            <span className="font-display text-[21px] font-semibold tracking-tight">Vesta</span>
            <span className="ml-auto" />
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="grid h-9 w-9 place-items-center rounded-full border border-line bg-panel text-ink-soft shadow-soft transition hover:border-accent hover:text-accent"
            >
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} className="h-[16px] w-[16px]" />
            </button>
            <Link
              href="/login"
              prefetch
              className="rounded-full border border-line bg-panel px-4 py-[8px] text-[13px] font-semibold text-ink shadow-soft transition hover:border-accent hover:text-accent"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              prefetch
              className="hidden rounded-full bg-gradient-to-br from-accent to-accent-2 px-4 py-[8px] text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(47,125,235,0.32)] transition hover:brightness-110 sm:inline-flex"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* ------------------------- 3D scroll story ------------------------ */}
      <section
        ref={storyRef}
        aria-label="How Vesta works"
        style={{ height: reduced ? 'auto' : `${STORY_VH}vh` }}
        className="relative"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <VestaScene
            onReady={(handle) => {
              // The scene chunk loads async — sync it to wherever the user
              // has already scrolled. (Callback, not ref: next/dynamic drops refs.)
              sceneRef.current = handle;
              handle.setProgress(progressRef.current);
            }}
            theme={theme}
            reducedMotion={reduced}
            className="absolute inset-0 h-full w-full"
          />

          {/* Hero overlay — yields to the story on first scroll. */}
          <div
            ref={heroRef}
            className="pointer-events-auto absolute inset-x-0 top-[16vh] z-10 mx-auto max-w-[760px] px-6 text-center"
          >
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-accent">
              Vesta — AI chief of staff
            </p>
            <h1 className="mt-4 font-display text-[40px] font-semibold leading-[1.04] tracking-tight sm:text-[64px]">
              Your work, in order.
            </h1>
            <p className="mx-auto mt-5 max-w-[560px] text-[15px] leading-relaxed text-ink-soft sm:text-[17px]">
              Vesta reads your inbox, filters the noise, and hands you a ranked radar of the few
              things that actually need you — with reasons you can read.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/login"
                prefetch
                className="rounded-full bg-gradient-to-br from-accent to-accent-2 px-6 py-[12px] text-[14px] font-semibold text-white shadow-[0_10px_28px_rgba(47,125,235,0.38)] transition hover:brightness-110"
              >
                Get started
              </Link>
              <button
                type="button"
                onClick={scrollToStory}
                className="rounded-full border border-line-strong bg-panel px-6 py-[12px] text-[14px] font-semibold text-ink transition hover:border-accent hover:text-accent"
              >
                See how it works
              </button>
            </div>
          </div>

          {/* Step rail — bottom-left, VECTR-style numbered story. */}
          <div className="absolute bottom-[4vh] left-4 z-10 max-w-[460px] pr-4 sm:left-8 sm:pr-0">
            <ol className="m-0 list-none p-0">
              {STEPS.map((s, i) => {
                const active = i === activeStep;
                return (
                  <li key={s.n} className="mb-1">
                    <div
                      className={[
                        'flex items-baseline gap-4 transition-all duration-300',
                        active ? '' : 'opacity-60',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'grid h-9 w-9 flex-none place-items-center rounded-[10px] font-mono text-[12px] font-bold transition-colors duration-300',
                          active
                            ? 'bg-accent text-white shadow-[0_6px_18px_rgba(47,125,235,0.35)]'
                            : 'border border-line bg-panel text-muted',
                        ].join(' ')}
                      >
                        {s.n}
                      </span>
                      <div className="min-w-0">
                        <h3
                          className={[
                            'm-0 font-display tracking-tight transition-all duration-300',
                            active
                              ? 'text-[22px] font-semibold text-ink sm:text-[26px]'
                              : 'text-[14px] font-medium text-ink-soft',
                          ].join(' ')}
                        >
                          {s.title}
                        </h3>
                        <div
                          className={[
                            'grid transition-[grid-template-rows,opacity] duration-300',
                            active ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                          ].join(' ')}
                        >
                          <p className="m-0 mt-2 overflow-hidden border-l-2 border-accent pl-4 text-[13px] leading-relaxed text-ink-soft sm:text-[14px]">
                            {s.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Scroll hint while on the hero. */}
          <div
            className={[
              'absolute bottom-[3vh] left-1/2 z-10 -translate-x-1/2 transition-opacity duration-500',
              activeStep === -1 && !reduced ? 'opacity-100' : 'pointer-events-none opacity-0',
            ].join(' ')}
            aria-hidden="true"
          >
            <span className="flex flex-col items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              Scroll
              <span className="block h-8 w-px overflow-hidden bg-line">
                <span className="block h-3 w-px animate-vesta-shimmer bg-accent" />
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* ------------------- the command center (hero features) ------------------- */}
      <section className="relative border-t border-line bg-bg px-5 pt-20 sm:pt-28">
        <div className="mx-auto max-w-[1320px] pb-4 sm:pb-8">
          <div data-parallax className="max-w-[640px]">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              The command center
            </p>
            <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-tight sm:text-[40px]">
              Everything that needs you.
              <br />
              Nothing that doesn&apos;t.
            </h2>
          </div>
        </div>
      </section>

      {/* Full-bleed spotlight bands: radar / readable reasons / drafts. */}
      <FeatureSpotlights reduced={reduced} />

      {/* --------------------- the rest of the toolkit (grid) --------------------- */}
      <section className="relative border-t border-line bg-bg px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-[1320px]">
          <div data-parallax className="max-w-[640px]">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              And the rest of the toolkit
            </p>
            <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-tight sm:text-[40px]">
              Small things that add up to calm.
            </h2>
          </div>
          <div data-cardgrid className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="rounded-[var(--radius)] border border-line bg-panel p-6 shadow-soft transition hover:-translate-y-1 hover:border-line-strong"
              >
                <span
                  data-cardicon
                  className="grid h-10 w-10 place-items-center rounded-[12px] bg-accent-soft text-accent"
                >
                  <Icon name={f.icon} className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-4 font-display text-[18px] font-semibold tracking-tight">
                  {f.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------- roadmap: where Vesta goes ------------------------ */}
      <section className="relative border-t border-line bg-panel px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-[1320px]">
          <div data-parallax className="flex max-w-[640px] flex-col gap-3">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-[#8b7cf6]">
              On the roadmap
            </p>
            <h2 className="m-0 font-display text-[30px] font-semibold leading-tight tracking-tight sm:text-[40px]">
              Where Vesta goes next.
            </h2>
          </div>
          {/* The journey's violet streams, continued: a line draws to what's coming. */}
          <div aria-hidden="true" className="mt-12 hidden sm:block">
            <div
              data-drawline
              className="h-[2px] w-full rounded-full bg-gradient-to-r from-accent via-[#8b7cf6] to-[#8b7cf6] opacity-60"
              style={{ clipPath: reduced ? undefined : 'inset(0 100% 0 0)' }}
            />
          </div>
          <div data-stagger className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {ROADMAP.map((r) => (
              <article
                key={r.title}
                className="rounded-[var(--radius)] border border-dashed border-line-strong bg-bg p-6"
              >
                <span className="inline-flex rounded-full border border-[#8b7cf6]/40 px-[10px] py-[3px] font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#8b7cf6]">
                  Soon
                </span>
                <h3 className="mt-4 font-display text-[17px] font-semibold tracking-tight">
                  {r.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{r.body}</p>
              </article>
            ))}
          </div>
          <p className="mb-0 mt-6 text-[12px] text-muted">
            On the roadmap — designed, not yet in the product. The wireframe horizon at the end of
            the journey above is the same promise.
          </p>
        </div>
      </section>

      {/* ------------------------------ safety ----------------------------- */}
      <section className="border-t border-line bg-panel px-5 py-16">
        <div className="mx-auto max-w-[1320px]">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <h2
              data-parallax
              className="m-0 max-w-[420px] font-display text-[26px] font-semibold leading-tight tracking-tight sm:text-[32px]"
            >
              Built on approval,
              <br />
              not autopilot.
            </h2>
            <ul data-stagger className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
              {SAFETY.map((s) => (
                <li key={s.text} className="flex items-start gap-3">
                  <span className="mt-[2px] grid h-7 w-7 flex-none place-items-center rounded-[9px] bg-green-soft text-green">
                    <Icon name={s.icon} className="h-[14px] w-[14px]" />
                  </span>
                  <span className="text-[13.5px] leading-snug text-ink-soft">{s.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---------------------------- how to start ------------------------- */}
      <section className="border-t border-line bg-bg px-5 py-20 sm:py-28">
        <div className="mx-auto max-w-[1320px]">
          <div data-parallax className="max-w-[640px]">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              Two minutes to calm
            </p>
            <h2 className="mt-3 font-display text-[30px] font-semibold leading-tight tracking-tight sm:text-[40px]">
              Three steps. No setup project.
            </h2>
          </div>
          {/* The journey's path language, continued: a line draws across the steps. */}
          <div aria-hidden="true" className="mt-12 hidden sm:block">
            <div
              data-drawline
              className="h-[2px] w-full rounded-full bg-gradient-to-r from-accent via-accent-2 to-accent opacity-70"
              style={{ clipPath: reduced ? undefined : 'inset(0 100% 0 0)' }}
            />
          </div>
          <ol data-stagger className="mt-6 grid list-none grid-cols-1 gap-4 p-0 sm:mt-8 sm:grid-cols-3">
            {[
              ['Create your account', 'Email or Microsoft/Google single sign-on — your theme and choices stick.'],
              ['Connect Outlook', 'One consent screen. Vesta starts reading recent mail and keeps itself in sync.'],
              ['Meet your radar', 'Open the dashboard to a ranked, explained list of what needs you today.'],
            ].map(([title, body], i) => (
              <li
                key={title}
                className="relative rounded-[var(--radius)] border border-line bg-panel p-6 shadow-soft"
              >
                <span className="font-mono text-[12px] font-bold text-accent">{`0${i + 1}`}</span>
                <h3 className="mt-2 font-display text-[18px] font-semibold tracking-tight">{title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ------------------------------- CTA ------------------------------- */}
      <section className="border-t border-line bg-bg px-5 pb-24 pt-8">
        <div
          data-reveal
          className="relative mx-auto max-w-[1320px] overflow-hidden rounded-[var(--radius-lg)] border border-line-strong bg-panel p-10 text-center shadow-glow sm:p-16"
        >
          <span
            className="animate-vesta-breathe pointer-events-none absolute inset-0 bg-[radial-gradient(600px_240px_at_50%_-10%,var(--accent-soft),transparent_70%)]"
            aria-hidden="true"
          />
          <h2 className="relative m-0 font-display text-[30px] font-semibold leading-tight tracking-tight sm:text-[44px]">
            Take back your mornings.
          </h2>
          <p className="relative mx-auto mt-4 max-w-[460px] text-[14.5px] leading-relaxed text-ink-soft">
            Stop excavating your inbox. Start your day from a radar that already knows what
            matters — and why.
          </p>
          <div className="relative mt-8">
            <Link
              href="/login"
              prefetch
              className="inline-flex rounded-full bg-gradient-to-br from-accent to-accent-2 px-8 py-[13px] text-[15px] font-semibold text-white shadow-[0_12px_32px_rgba(47,125,235,0.4)] transition hover:brightness-110"
            >
              Get started — it&apos;s your inbox, organized
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------- finale: the path draws VESTA -------------------- */}
      {/* The glowing line from the journey arrives one last time and writes the
          wordmark stroke by stroke as the final screens scroll in. */}
      <footer
        ref={finaleRef}
        className="relative overflow-hidden border-t border-line bg-bg px-5 pb-8 pt-16 sm:pt-24"
      >
        <div className="mx-auto max-w-[1200px]">
          <svg
            role="img"
            aria-label="Vesta"
            viewBox="0 0 1080 312"
            className="block h-auto w-full select-none"
          >
            <defs>
              <linearGradient
                id="vesta-finale-grad"
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2="1080"
                y2="0"
              >
                <stop offset="0" style={{ stopColor: 'var(--accent)' }} />
                <stop offset="1" style={{ stopColor: 'var(--accent-2)' }} />
              </linearGradient>
            </defs>
            {/* The incoming line from the page above. */}
            <path
              data-lead
              d="M540 0 V58"
              fill="none"
              stroke="url(#vesta-finale-grad)"
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={reduced ? 0 : 100}
            />
            {/* Stroke layer: the letters draw in… */}
            <g style={{ filter: 'drop-shadow(0 0 14px var(--accent))' }}>
              {FINALE_LETTERS.map((ch, i) => (
                <text
                  key={`stroke-${ch}`}
                  data-stroke
                  x={108 + i * 216}
                  y={248}
                  textAnchor="middle"
                  className="font-display"
                  fontSize="232"
                  fontWeight="600"
                  fill="none"
                  stroke="url(#vesta-finale-grad)"
                  strokeWidth="2.5"
                  strokeDasharray={2200}
                  strokeDashoffset={reduced ? 0 : 2200}
                >
                  {ch}
                </text>
              ))}
            </g>
            {/* …then fill with the accent gradient. */}
            {FINALE_LETTERS.map((ch, i) => (
              <text
                key={`fill-${ch}`}
                data-fill
                x={108 + i * 216}
                y={248}
                textAnchor="middle"
                className="font-display"
                fontSize="232"
                fontWeight="600"
                fill="url(#vesta-finale-grad)"
                opacity={reduced ? 1 : 0}
              >
                {ch}
              </text>
            ))}
          </svg>
          <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-line pt-6 text-[12.5px] text-muted">
            <span>Your work, in order.</span>
            <span className="ml-auto flex items-center gap-4">
              <Link href="/login" prefetch className="transition hover:text-accent">
                Sign in
              </Link>
              <span>© {new Date().getFullYear()} Vesta</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
