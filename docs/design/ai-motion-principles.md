# Vesta AI Motion Principles

**Phase:** 0.5
**Status:** Active design guidance
**Keyframes:** `app/globals.css` (`vesta-*` animations)

---

## Vesta personality

Motion must make Vesta feel:

calm · precise · organized · executive · futuristic · AI-native · trustworthy

Never: noisy · childish · cyberpunk · flashy.

The goal feeling: **"Vesta is organizing my work and reducing noise"** — not
"this dashboard has a lot of animations".

---

## Allowed motion

- Slow pulse / breathing glow (live status dots, signal accents).
- Soft expanding ripple behind a live dot.
- Gentle drifting shimmer at very low opacity (Morning Brief signal layer).
- Slow orbital rotation + soft radar sweep (loading screen only).
- Small state transitions (hover, tab change, panel open/close).
- Staged fade-in reveals.

## Disallowed motion

- Fast flashing / strobing / high-frequency flicker.
- Neon overload or aggressive cyberpunk effects.
- Large bouncing or distracting elements.
- Constant movement near reading areas (body copy, drafts, lists).
- Any motion that hurts readability or contrast.

---

## Animation timing

- Simple hover/interaction: **150–220ms**.
- Panel / drawer transitions: **250–350ms**.
- Ambient loops (pulse, shimmer, orbit): **2.4s–22s** — slow and low-frequency.
- Easing: `--ease` (`cubic-bezier(0.2, 0.7, 0.2, 1)`) or `ease-out` / `ease-in-out`.

---

## Performance rules

- Animate only **`transform` and `opacity`** (compositor-friendly). Avoid
  animating layout properties (width/height/top/left) or box-shadow in loops.
- Prefer CSS keyframes / SVG over JS animation; **no external animation library**.
- Keep the number of concurrently animating elements small (the splash uses a
  handful of rings/nodes, not a particle field).
- Decorative layers are `pointer-events: none` and never trigger reflow.

---

## Splash & atmosphere

- The **initialization splash** (`VestaSplashScreen`) is the one place with richer
  motion (orbits, radar sweep, breathing core, progress) — acceptable because it
  is a brief, focused brand moment, not a working surface. It is fully opaque and
  reduced-motion safe.
- The **dashboard atmosphere** (`DashboardAtmosphere`) is static (no animation) —
  just low-opacity radial blooms. It has **no grid** (a grid behind translucent
  cards read as noisy graph paper behind the work list). A grid is used only on
  the opaque splash, where there is no readable content behind it.

---

## Readability rules

- Decorative layers sit on `-z-10` (or a fixed background layer) and use
  `pointer-events: none` so they never affect layout or interaction.
- Ambient effects stay below ~0.5 opacity and avoid reading areas.
- The Morning Brief shimmer/accent must never reduce text contrast.
- Atmospheric background blooms (`--atmos-*`) are kept very low opacity,
  especially in light mode.
- **Never put a grid (or any patterned background) behind readable content** —
  Today's Radar, work rows, Morning Brief text, metrics, or rail text cards.
  Card surfaces are **opaque** (dark `--panel` is a solid dark-blue) so ambient
  atmosphere shows only in the shell gaps/margins/header, never through content.

---

## Reduced-motion rules

Every decorative animation is disabled under:

```css
@media (prefers-reduced-motion: reduce) {
  animation: none;
}
```

The only exception is the loading-screen fade-out, which is reduced to a short
opacity-only transition (no movement). Hover/focus state changes remain (they are
instant or near-instant and aid usability), but looping motion is removed.

Keyboard focus is always visible via a global `:focus-visible` accent ring; it is
never removed without a replacement.
