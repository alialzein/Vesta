# Vesta Loading / Initialization Experience — v1

**Phase:** 0.5 (revision)
**Status:** Implemented (demo-only)
**Component:** `components/dashboard/VestaSplashScreen.tsx`

---

## Purpose

The user should not enter the app through a blank page or a generic spinner. Vesta
shows a short, branded **initialization screen** so the first impression is that a
manager is booting an AI command center — calm, organized, intelligent.

It communicates: AI · organization · signal from noise · calm intelligence ·
manager command center · _your work, in order_.

This is **demo-only** in Phase 0: a timed splash, not a real data-loading gate.
In production it would be shown only on first login/session, during major
dashboard initialization, or as a skeleton while real data loads.

---

## Why the dashboard is hidden during the splash

The first attempt rendered the splash as a semi-transparent overlay, so dashboard
rows were visible behind it and the text looked washed out. The root cause: a
solid base color had been placed inside a `background-image` list (which only
accepts `<image>` values), so the base color was dropped and the layer was
effectively transparent.

The revision fixes this: the splash uses the `.vesta-splash` class whose **`background` shorthand** ends in a solid color (`#070b14`), guaranteeing an opaque,
full-screen surface at `z-[300]`. No dashboard content shows through. The splash
is `position: fixed; inset: 0; overflow: hidden`, so it never creates scrollbars
or layout shift.

---

## Visual concept

A centered luminous **AI signal system** on a dark, futuristic field:

- A breathing core sphere containing the Vesta flame mark.
- Three concentric **orbital rings** (outer / middle counter-rotating / inner),
  carrying **5 small glowing signal nodes** that travel as the rings rotate —
  reading as organized intelligence rather than a spinner.
- A soft conic **radar sweep** behind the core.
- A soft outer glow halo + a larger soft **radial field** behind the system, and
  a faint masked **engineering grid** (splash only — never on the dashboard).
- A small live **equalizer** above the wordmark.
- Wordmark "Vesta", the tagline "Your work, in order", a rotating status phrase,
  and a branded **cyan→mint progress bar** (with a soft glow) that fills over the
  splash duration. Spacing between orb, title, tagline, phrase, and progress is
  tuned for a calm, premium rhythm.

It leans dark/futuristic in both themes for a stronger brand impression.

---

## Duration

- Constant: `SPLASH_DURATION_MS` (≈ **1800ms**), then a ~0.45s fade-out, then unmount.
- Under the **test environment** (`NODE_ENV === 'test'`) the duration is **0**, so
  it calls `onDone` immediately and never blocks unit/e2e tests.
- Plays **on every full page load**. `DashboardClient` mounts once for the app
  shell, so internal navigation (e.g. Today ↔ Memory) does not replay it — only a
  real page load / refresh does. (An earlier revision gated this behind a
  `sessionStorage` flag, but that made the splash flash for a single frame on
  every reload after the first, so the gate was removed.)

---

## Copy

Title: **Vesta** · Subtitle: **Your work, in order**

Rotating staged phrases:

1. Preparing your command center
2. Organizing today’s signal
3. Mapping decisions and follow-ups
4. Aligning priorities
5. Loading Vesta

---

## Animation behavior

- Ring rotation: slow (`22s` outer / `13s` reverse middle / `9s` inner), linear.
- Core: gentle breathe (scale 0.94–1.06).
- Radar sweep: `3.6s` linear conic wedge.
- Nodes + progress bar: slow, calm.
- Keyframes live in `app/globals.css` (`vesta-orbit`, `vesta-orbit-slow`,
  `vesta-orbit-rev`, `vesta-breathe`, `vesta-sweep`, `vesta-progress`,
  `vesta-fade-in`, `vesta-fade-out`).

---

## Reduced-motion behavior

`@media (prefers-reduced-motion: reduce)` disables every decorative animation,
leaving a static (still opaque, still branded) splash with the same title,
tagline, and first status phrase. The overlay still fades out (opacity only, no
movement) over a shorter duration.

---

## Accessibility

- Root has `role="status"` + `aria-label="Loading Vesta"`; the status phrase is in
  an `aria-live="polite"` region.
- All decorative visuals are `aria-hidden`.
- It does not trap keyboard focus permanently — it unmounts after the duration.
- Test hooks: `data-testid="vesta-splash-screen"`, `vesta-splash-core`,
  `vesta-splash-message`.

---

## How to disable / fast-forward for tests

- Unit/component tests: `SPLASH_DURATION_MS` is `0` under `NODE_ENV === 'test'`,
  and `DashboardClient` never auto-shows the splash in test (so dashboard tests
  are unaffected). The splash is tested directly in
  `components/__tests__/VestaSplashScreen.test.tsx`.
- E2E: the splash plays on each page load; specs wait for
  `getByTestId('vesta-splash-screen')` to be hidden before interacting.

---

## When to show in future production

- First login / new session only.
- During genuine dashboard initialization or major data refresh.
- As a skeleton/placeholder while real Outlook/AI data loads (Phase 2+).

It should **not** reappear on every navigation.
