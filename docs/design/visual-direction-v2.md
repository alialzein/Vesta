# Visual Direction v2 — Phase 0.1 Dashboard Polish

This document describes the Phase 0.1 visual refresh of the Vesta dashboard.
It is still **frontend / demo only**: no Supabase, Microsoft Graph, OpenAI, auth,
migrations, or secrets. All data lives in [`lib/demo-data.ts`](../../lib/demo-data.ts).

The goal of v2 is to make the dashboard feel like a **premium light SaaS
executive dashboard**, with dark mode preserved. The light theme is now an
intentionally designed palette rather than an inverted dark theme.

## What was inspired by the reference screenshots (without copying them)

The work was guided by modern light SaaS dashboards. We borrowed only general
patterns, not layouts or assets:

- A **utility topbar** with search, integration status, notifications, and a
  profile chip — a common SaaS pattern, rebuilt around manager concerns
  (Outlook sync status, not generic app chrome).
- **Gradient "quick action" cards** — reframed entirely as an **AI Command
  Center** focused on manager work (Clear My Day, Meeting Prep, Delegate Work,
  Clean Inbox), not generic shortcuts.
- A **contextual right rail with tabs** — reframed as an AI assistant that
  reasons about the _selected work item_ (decisions, drafts, memory, activity).
- **Soft blue-tinted backgrounds and clean white cards** — applied with Vesta's
  own Arctic Frost identity (flame mark, Fraunces display type, accent gradient).

Everything remains anchored to the product principle (AGENTS.md): this is a
**manager command center**, not an inbox clone. Every surface maps to decisions,
follow-ups, promises, blockers, drafts, or AI assistance.

## Light theme palette (CSS variables in `app/globals.css`)

| Token             | Value     | Use                                |
| ----------------- | --------- | ---------------------------------- |
| `--bg`            | `#EEF5FF` | Soft blue-tinted page background   |
| `--panel`         | `#FFFFFF` | Clean white cards                  |
| `--panel-2/-soft` | `#F7FAFF` | Nested / soft card surfaces        |
| `--accent`        | `#2F7DEB` | Primary blue (CTAs, active states) |
| `--accent-2`      | `#43C7FF` | Sky accent (gradients)             |
| `--green`         | `#1CA888` | Mint-derived success / "connected" |
| `--ink`           | `#1C2F4A` | Primary text                       |
| `--ink-soft`      | `#44587A` | Secondary text                     |
| `--muted`         | `#6F8197` | Muted/helper text                  |
| `--line`          | `#DCE7F5` | Soft borders                       |
| `--line-strong`   | `#C8D8EE` | Stronger borders                   |
| `--red`           | `#EF5B5B` | Danger                             |
| `--amber`         | `#F3B84A` | Warning (text uses a darker shade) |

Light mode also uses softer, layered shadows (`--shadow*`, `--glow`), refined
radii (`--radius`, `--radius-lg`, `--radius-sm`), and disables the film-grain
overlay (`--grain-opacity: 0`).

## Dark theme palette

The original Arctic Frost **dark** palette is unchanged in spirit (deep navy
background `#0A0F17`, glassy translucent panels, `#5BA8F5`/`#67E8D8` accents). It
gained the same **new tokens** the light theme uses so both themes share one
token set:

- `--panel-soft` — soft nested surface.
- `--cmd-1a/1b … --cmd-4a/4b` — the four AI Command Center gradient pairs.

## Topbar structure

`components/dashboard/Topbar.tsx` — greeting on the left, a clean utility toolbar
on the right. All controls have `aria-label`s and are keyboard reachable.

- **Mobile menu** button (hamburger) — opens the sidebar drawer (`< lg` only).
- **Search** input (decorative placeholder; `⌘K` hint; `2xl+`).
- **Notification bell** — demo unread badge, inset + ring-wrapped so it is never
  clipped (0.4).
- **Settings** button (placeholder, no page).
- **Theme toggle** — animated sun/moon switch.

The right-hand cluster is `flex-none` so it never wraps under the greeting (0.4).

Moved **out** of the topbar in 0.4: the **AI-rail toggle** (now a small control
inside the AI Assistant panel header), the **Outlook status** (now a subtle
"Outlook Connected" line in the sidebar footer), and the **profile chip** (the
avatar and name already live in the sidebar footer — no duplication).

Rules: nothing is crowded (controls appear progressively by breakpoint), no real
notifications/settings/search backends exist yet. The greeting heading uses
`inline-block` + padding on the gradient name so the italic "i" is never
clipped (0.4).

> **Phase 0.3 update — focus & simplicity.** The Today page was simplified so the
> work queue is the focus (`Work first. Intelligence second. News later.`). The
> large AI Command Center cards are no longer rendered on the Today page, the
> Morning Brief is compact (no large ring), and the six KPI cards became a compact
> metrics strip. The sections below are kept for history; the current state is
> noted inline. Plan: `docs/design/phase-0-3-dashboard-focus-polish-plan.md`.

## AI Command Center cards (reserved — not on Today page since 0.3)

`components/dashboard/AiCommandCenter.tsx`, data in `demoCommandCards`.

Four soft-gradient cards (Clear My Day, Meeting Prep, Delegate Work, Clean Inbox).
Each card: icon badge, title, short description, CTA button, soft gradient wash
(driven by `--cmd-*` vars so it adapts per theme), and a hover lift.

**Status (0.3):** removed from the main Today dashboard. The component is kept and
gated behind `SHOW_LARGE_COMMAND_CENTER = false` in `DashboardClient.tsx` for a
possible future expanded-actions page. The four actions now live as compact
quick-action buttons in the Morning Brief.

## Metrics strip (replaces the KPI cards since 0.3)

`components/dashboard/MetricsStrip.tsx`, data in `demoKpis`. A single low-profile
horizontal strip instead of six large cards:

- **Primary (4):** Decision Debt, People Blocked, Follow-up Risk, Drafts Ready —
  icon badge + bold number + label, with thin dividers.
- **Secondary (2):** Promises at Risk, Time to Clear — small muted "label value"
  pairs pushed to the end.

Each metric still carries a `filter` category for future click-to-filter on the
Radar. The earlier `KpiCards.tsx` component is retained but no longer rendered.

## Sidebar — expanded / collapsed behavior

Split into three components so the toggle never overlaps the logo:

- `SidebarHeader.tsx` — reserves space for brand + toggle.
  - **Expanded (~280px):** logo + "Vesta" + tagline on the left; collapse button
    in its own right-side control slot (a flex row, not absolutely positioned
    over the logo).
  - **Collapsed (~88px):** centered logo with the expand button on a **separate
    row beneath** it (a safe position, never over the logo).
- `SidebarNav.tsx` — expanded shows icon + label + count pill; collapsed shows
  centered icon-only buttons with **consistent mini count badges** on the icon
  corner and **hover/focus tooltips**. Active item has a clear background + accent
  bar. No random notification dots.
- `SidebarFooter.tsx` — profile card; simplified to just the avatar when collapsed.

The transition between widths is smooth (`transition-[grid-template-columns]`).

## Right AI Assistant Rail — contextual + collapsible

`components/dashboard/AiAssistantRail.tsx` (expanded) and
`components/dashboard/CollapsedRail.tsx` (collapsed strip).

- **Header:** selected item title, **Live** badge, priority score + band.
- **Segmented control / tabs:** Action · Draft · Memory · Activity.
  - **Action:** Next Best Action, "Why this matters", risk chips, buttons
    (Approve Draft, Ask Legal, Delegate, Snooze).
  - **Draft:** suggested draft preview, Edit / Approve Draft, and the required
    safety copy ("Vesta will not send emails without your explicit approval.").
  - **Memory:** VIP / Tone / Delegation rules used + an "Add a memory" placeholder.
  - **Activity:** follow-up count, last manager reply, due time, reminder status.
- It is **contextual**: selecting a different Radar row updates the rail.
- **Light-mode surface (0.4):** the rail uses a distinct **blue-tinted gradient**
  (`--rail-bg`, via `bg-[image:var(--rail-bg)]`) plus a visible blue border
  (`--rail-border`), with nested cards in solid white, so it reads as a dedicated
  assistant zone rather than merging with the white content cards. Dark mode uses
  a subtle glassy gradient.
- **Collapse control (0.4):** a small icon button in the panel header collapses
  the rail; re-expand is via the slim collapsed icon strip.

### Collapse behavior

- **Expanded width ~400px**; **collapsed width 64px**.
- Collapsed shows a vertical icon strip (AI, Action, Draft, Memory, Chat) with
  tooltips; a small red dot appears when the selected item is high priority.
  Clicking an icon **expands the rail and opens the matching tab** (or opens chat).

## Today's Radar

`components/dashboard/TodaysRadar.tsx` + `WorkItemRow.tsx`. Polished selected row
(accent border + soft shadow + accent bar), tone-colored priority badge, a
source chip (Outlook / Teams / Calendar / …), category chips, and a right-aligned
status/due column. Filters (pill tabs, horizontally scrollable on small screens):
**All, Decisions, Blockers, Follow-ups, Promises, Can delegate, Drafts.** Selection
behavior is preserved.

## Morning Brief (compact since 0.3)

`components/dashboard/MorningBrief.tsx`. A short hero card (target ~120–150px on
desktop): a pill "Live morning brief" badge, a small red **"Top risk: 92"** chip,
the headline (kept verbatim), one concise summary line, and **three** compact quick
actions (Clear My Day [primary], Draft Replies, Meeting Prep). **Delegate was
removed here in 0.4** to avoid duplicating the Delegate action in Today's Radar
and the rail. The large urgency ring was removed (0.3) so the priority score is
not repeated. `UrgencyRing.tsx` is retained for reuse.

## Reduced priority repetition (0.3)

The priority score now appears only where it drives action: the **Today's Radar
row** badge and the **AI Assistant Rail** header. The Morning Brief shows just the
compact "Top risk" chip.

## Ask Vesta (0.3)

The floating "Ask Vesta" button becomes compact (icon-only) while the AI rail is
expanded on desktop, so it does not compete with the rail. Roles stay distinct:
the **rail** explains the selected item; **Ask Vesta** handles free-form questions.

## Mobile / responsive behavior

Breakpoints: large desktop → laptop (`lg`) → tablet (`md`/`sm`) → mobile.

- **Sidebar** is a grid column at `lg+`; below `lg` it is hidden and opens as an
  **overlay drawer** from the topbar hamburger (backdrop + Escape to close). The
  drawer is only mounted while open.
- **Right AI rail** is a grid column at `lg+` (expanded panel or 64px strip);
  below `lg` it **stacks below the main content** (always expanded) so the layout
  never breaks.
- **Morning Brief** quick actions wrap; the **metrics strip** wraps and its
  dividers/secondary metrics collapse cleanly on small screens.
- **Today's Radar** rows reflow to a two-row layout on narrow screens and the
  filter pills scroll horizontally.

## Memory & Rules — full page (0.4)

`components/dashboard/MemoryView.tsx` is a full-width workspace: header + intro,
an add form, **category filter tabs** (All, VIPs & People, Tone & Style,
Delegation, Safety / Never, Clients & Context) with live counts, a responsive
1→2 column list of saved memories, and a side help/tips panel (drops below on
`< xl`). Demo-only; works in light + dark.

## App scrolling (0.4)

The shell is a viewport-height grid (`grid-rows-[minmax(0,1fr)]`) with `body`
`overflow: hidden`; the `main` column and the right `aside` are the scroll
containers (`overflow-y-auto` + `min-h-0`). This makes Today's Radar scroll
reliably (wheel/trackpad/keyboard) without clipped or inaccessible rows; the rail
scrolls independently.

## Tests

Unit/component (Vitest): topbar (no labelled AI button, profile name, simplified
status, badge), metrics strip, compact Morning Brief (+ no Delegate), command
center (isolated), large command center **absent** from the dashboard, full-page
Memory & Rules (add form + category tabs), sidebar collapse keeps nav access, theme
defaults to light + toggles, rail collapse/expand, rail tab switch + demo action
feedback, Radar filters, and selecting a Radar item updates the rail. E2E
(Playwright) covers the same critical flows. See `components/__tests__/` and `e2e/`.
