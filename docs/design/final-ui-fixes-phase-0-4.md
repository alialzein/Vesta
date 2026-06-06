# Phase 0.4 — Final UI/UX Fixes

A focused fix pass on top of the Phase 0.3 dashboard. **No redesign** — same product
structure and visual direction. Still **frontend / demo-only**: no Supabase, Graph,
AI API, auth, migrations, or secrets; all data stays in `lib/demo-data.ts`.

## Topbar cleanup

- **Removed the AI-rail toggle from the topbar entirely.** AI access is the right
  rail itself + the floating "Ask Vesta" button. The rail's **collapse control now
  lives inside the AI Assistant panel header** (a small `h-7 w-7` icon button), and
  re-expand happens from the slim collapsed icon strip. No AI button clutters the
  topbar.
- **Removed the Outlook status from the topbar.** "Outlook · Synced 2 min ago" was
  not actionable on the dashboard and consumed space. A subtle **"Outlook
  Connected"** status (green dot) now lives in the **sidebar footer**, above the
  profile card. Detailed sync timing is reserved for a future Settings area.
- **Profile removed from the topbar.** The avatar + name already live in the
  **sidebar footer**, so the topbar no longer duplicates them. This keeps the
  header light and avoids two profile chips on screen.
- **No-wrap utility cluster.** The right-hand controls (search, notifications,
  settings, theme) are a `flex-none` group, so they stay on one row beside the
  greeting instead of wrapping under it.

## Fixes

- **Notification badge clipping.** The badge now sits in an `overflow-visible`
  button, is positioned with `translate-x-1/2 -translate-y-1/2` from the top-right
  corner, and has a 2px ring in the panel color so it reads cleanly and is never
  cut in light or dark mode or at responsive sizes.
- **"Good morning, Ali" clipping.** The italic Fraunces name used
  `background-clip: text`, which clipped the italic overhang of the "i". Fixed by
  making the gradient name `inline-block` with right padding, and giving the
  heading `leading-[1.18]`, `overflow-visible`, and a little bottom padding.
- **Right AI rail light-mode background.** The rail uses a distinct **blue-tinted
  gradient** (`--rail-bg`, applied via `bg-[image:var(--rail-bg)]`) plus a visible
  blue border (`--rail-border: #d3e2f7`) so it clearly reads as a dedicated
  assistant zone — separate from both the page background and the white content
  cards. (An earlier `#F4F8FF` tint was too close to the page to be noticeable.)
  Nested cards inside the rail stay solid white to pop. Dark mode uses a subtle
  glassy gradient.

## Morning Brief

- **Removed "Delegate"** from the Morning Brief quick actions — it duplicated the
  Delegate action available in Today's Radar rows and the AI rail. The brief now
  keeps three focused quick actions: **Clear My Day, Draft Replies, Meeting Prep.**

## Memory & Rules — full page

The page was a single narrow card; it's now a proper full-width workspace:

1. **Header + intro** (icon, title, "Teaches AI" badge, explanation).
2. **Add new memory/rule** form (type select + text input + Remember button).
3. **Category filter tabs** with live counts: All, VIPs & People, Tone & Style,
   Delegation, Safety / Never, Clients & Context. The seven memory types map onto
   these five manager-facing categories.
4. **Saved memories list** — a responsive 1→2 column grid, filtered by category,
   with type tags and a "forget" control. Empty categories show the shared
   `NoMemoriesState`.
5. **Side help/tips panel** ("How memory works" + a safety note).

Demo-only: memories live in session React state; no persistence or AI. Works in
light and dark mode and is responsive (the help panel drops below on `< xl`).

## Today's Radar scrolling

Root cause: the app shell is a full-height grid with `body { overflow: hidden }`
and inner scroll containers (`main`, the right `aside`). The grid's single row was
auto-sized to content, so the scroll containers were never height-constrained —
content (including lower Radar rows) overflowed and became hard/impossible to
reach.

Fix: constrain the shell to the viewport and let the scroll children shrink:

- Root grid: `grid-rows-[minmax(0,1fr)]` so the row is exactly the viewport height.
- Content wrapper, `main`, and the rail `aside`: `min-h-0` so their
  `overflow-y-auto` actually engages.

Result: the **main page column scrolls** smoothly (wheel, trackpad, keyboard); the
right rail scrolls independently; no clipped or inaccessible rows. Row selection
still updates the right rail.

## Preserved hierarchy

Unchanged from 0.3 (intentionally): Topbar → compact Morning Brief → compact
Metrics Strip → Today's Radar → right AI Assistant Rail. No large AI Command
Center cards on the Today page; no large duplicate widgets above the Radar.
