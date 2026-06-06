# Phase 0.5 — Vesta AI Brand Polish, Motion & Loading Experience Plan

**Project:** Vesta AI Chief of Staff  
**Phase:** 0.5  
**Plan type:** UI/UX polish, AI-branding, motion, loading experience, and visual-noise reduction  
**Implementation status:** Not started  
**Backend scope:** None  
**Database scope:** None  
**Target branch:** `feature/phase-0-5-ai-brand-polish`  
**Recommended file location:** `docs/design/phase-0-5-ai-brand-polish-plan.md`

---

> **Implementation status: Done (revised).** The first pass was too subtle and the
> loading screen rendered see-through. A revision on branch
> `feature/phase-0-5-ai-brand-polish-revision` delivered the visible improvements:
>
> - **Dark mode is now the default theme** (light still toggleable).
> - Loading screen rebuilt as a true full-screen, **opaque** > `components/dashboard/VestaSplashScreen.tsx` (orbital rings + traveling nodes +
>   radar sweep + breathing core + grid + progress), played **on every full page
>   load**, `SPLASH_DURATION_MS ≈ 1800`, 0ms in test, reduced-motion safe,
>   with `data-testid` hooks. Root cause of the old transparency: a solid color had
>   been placed inside a `background-image` list (invalid → dropped).
> - Atmosphere promoted to `components/dashboard/DashboardAtmosphere.tsx`.
> - Radar rows pushed to borderless-until-hover (one clean surface).
> - AI rail: active-tab glow + calm scanning shimmer on Next Best Action.
>
> **Final polish** (branch `feature/phase-0-5-final-ai-polish-fixes`): dark-mode
> card surfaces made **opaque** and the atmosphere **grid removed from the
> dashboard** (it read as graph paper behind Today's Radar) — only soft radial
> blooms remain in the shell background; a grid lives only on the splash. The
> splash was refined (soft field, more nodes, equalizer, branded progress).
> Rule: never put a grid/pattern behind readable content.
>
> See `docs/design/loading-experience-v1.md` and
> `docs/design/ai-motion-principles.md`.

---

## 1. Purpose

The current dashboard is now structurally correct:

```txt
Sidebar
Topbar
Compact Morning Brief
Compact Metrics Strip
Today's Radar
Right AI Assistant Rail
Ask Vesta
```

This phase should **not** redesign the product again.

The goal of this phase is to make Vesta feel more like a calm, futuristic, AI-native operating system for managers.

The manager should feel:

```txt
Vesta is organizing my work.
Vesta is reducing noise.
Vesta is intelligent, calm, and precise.
Vesta helps me see signal from chaos.
```

This means we need to:

- reduce visual noise
- remove “boxes inside boxes”
- make the Morning Brief feel like a live AI insight
- add a branded loading/initialization screen
- add subtle blue atmospheric depth
- refine the right AI rail
- keep the dashboard simple, focused, and easy on the eyes

---

## 2. Hard Scope Limits

Do **not** add:

```txt
Supabase
Microsoft Graph
OpenAI API calls
real AI calls
database migrations
real authentication
real Outlook data
real notification data
real email sending
secrets
.env changes beyond safe placeholders
```

Keep everything:

```txt
demo-only
frontend-only
TypeScript strict
component-based
documented
tested
```

Do **not** commit or push until the result is reviewed.

---

## 3. Current UI Issues to Fix

### 3.1 Ticket rows feel noisy

The current Today’s Radar rows are good, but still feel like they contain too many mini-boxes:

```txt
row border
priority badge box
source chip box
category chip boxes
action button box
due/status area
```

This creates a “box inside box inside box” feeling.

The goal is not to remove structure, but to make it lighter.

---

### 3.2 Morning Brief should feel more AI-native

The Morning Brief is now compact, which is good.

But visually it still feels like a normal dashboard card.

It should feel like:

```txt
a live AI signal
a generated insight
a calm intelligence surface
```

Also, the current left accent line does not perfectly respect the rounded card corner. This should be fixed.

---

### 3.3 Main dashboard needs stronger Vesta atmosphere

The dashboard is clean, but it can feel more AI-branded.

We need subtle blue atmospheric lighting/degradation from below or behind the content.

This must not hurt readability.

---

### 3.4 Right AI rail can feel more like an AI brain

The right rail is useful, but it can still feel like a static stack of cards.

It should feel more alive through:

```txt
micro-motion
status pulse
smart visual hierarchy
subtle action feedback
less heavy metadata display
```

---

### 3.5 Loading screen is missing

The user should not enter the app through a blank page or normal loading state.

Vesta should have a short branded initialization screen that makes the user feel they are entering an AI command center.

---

## 4. Design Principles

### 4.1 Vesta personality

Vesta should feel:

```txt
calm
precise
organized
executive
futuristic
AI-native
trustworthy
not noisy
not childish
not cyberpunk
```

### 4.2 Motion principles

Allowed:

```txt
slow pulse
soft glow
radar sweep
subtle orbital motion
gentle shimmer
breathing gradients
small state transitions
```

Avoid:

```txt
fast flashing
neon overload
strobing
aggressive cyberpunk effects
large distracting animations
constant movement near reading areas
motion that hurts readability
```

### 4.3 Visual hierarchy

The main hierarchy must remain:

```txt
1. Today's Radar
2. Morning Brief
3. Right AI Rail
4. Metrics Strip
5. Ask Vesta
6. Secondary navigation
```

Today's Radar must stay the main focus.

---

## 5. Implementation Plan

---

# Section A — Reduce “Boxes Inside Boxes” in Today’s Radar

## Goal

Make each work item row feel like one clean surface, not many stacked containers.

## Current issue

A row currently contains several elements that all look like small cards or boxes. The result is slightly noisy.

## Required changes

### A.1 Row surface

Make the row surface softer:

```txt
lighter border
softer background
less contrast between row and inner elements
subtle selected-state glow only on active row
```

For dark mode:

```txt
row background: dark blue/graphite surface
selected row: subtle blue tint + left signal glow
border: low contrast
```

For light mode:

```txt
row background: white or pale blue-white
selected row: light blue tint
border: soft blue-gray
```

### A.2 Reduce row height slightly

Target:

```txt
reduce row height by around 8–12px
```

Do not make rows cramped.

The goal is:

```txt
show more tickets without losing readability
```

Preferred laptop view:

```txt
4 full rows + part of 5th
or ideally 5 comfortable rows
```

### A.3 Priority score badge

Keep the priority score visible, but make it cleaner.

Current priority badge feels like a heavy box.

Improve it:

```txt
smaller vertical footprint
rounded but not chunky
soft fill
thin border
score remains readable
```

The score should still be the first visual anchor in the row.

### A.4 Source chip

Make source chip quieter.

Example:

```txt
OUTLOOK
TEAMS
MANUAL
```

Style:

```txt
small uppercase
low contrast
no heavy border
subtle background
```

### A.5 Category chips

Keep chips, but make them less “boxed”.

Use:

```txt
soft pill
low-opacity background
no heavy borders
small text
consistent spacing
```

### A.6 Suggested action chip/button

The row action, such as:

```txt
Approve draft reply
Approve payment
Send decision
Delegate to Operations
```

should look integrated, not like a separate large button.

Use one of these:

```txt
inline action pill
small soft CTA chip
subtle arrow/spark icon
```

Avoid making every action chip compete with the right rail primary action.

### A.7 Due/status column

Keep due/status clear.

Style should be:

```txt
compact
right aligned
high readability
not boxed
```

### A.8 Selected row

Selected row should have:

```txt
subtle blue background
thin accent line
soft glow
slightly stronger border
```

But avoid:

```txt
too much blue fill
too many inner highlights
heavy border around every element
```

## Acceptance criteria

- Radar rows feel cleaner.
- Rows are slightly more compact.
- There is less “box inside box” feeling.
- Selected row remains obvious.
- Actions remain readable.
- No row content is clipped.
- Radar selection still updates the right AI rail.

---

# Section B — Upgrade Morning Brief into a Live AI Signal Card

## Goal

The Morning Brief should feel like a live AI-generated insight, not a normal static card.

## Required content to keep

Keep:

```txt
LIVE MORNING BRIEF
Top risk: 92
One blocker is putting a client relationship at risk.
5 critical · 3 follow-ups · 1 finance blocker. Cedars Group needs confirmation before 4 PM.
Clear My Day
Draft Replies
Meeting Prep
```

Do not add Delegate back to Morning Brief.

Delegate belongs in:

```txt
Today's Radar rows
Right AI Rail
```

## B.1 Fix the left accent line

Current issue:

```txt
left light line does not respect the rounded corner
```

Fix:

Use one of these approaches:

### Option 1 — clipped pseudo-element

Create a pseudo-element inside the Morning Brief card:

```css
.morning-brief::before {
  content: '';
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 3px;
  border-radius: inherit;
  background: linear-gradient(...);
  clip-path: inset(0 0 0 0 round var(--radius));
}
```

Important:

```txt
accent must be clipped by the card radius
no straight line crashing into rounded corner
```

### Option 2 — corner glow instead of line

Use:

```txt
top-left glow
soft left inner shadow
subtle cyan bloom
```

This can be more elegant than a full line.

### Preferred result

A signal-like accent that feels integrated with the card shape.

## B.2 Add live pulse

Add a subtle animated live dot:

```txt
small green/cyan dot
slow pulse
low opacity outer ring
```

Respect reduced motion.

## B.3 Add AI shimmer / signal layer

Add a very subtle AI visual layer:

```txt
soft moving gradient
very low opacity
no readability impact
```

Possible implementation:

```css
background: radial-gradient(...), linear-gradient(...);
```

or pseudo-element:

```txt
absolute overlay
opacity 0.10 or less
mix-blend normal or screen depending theme
pointer-events none
```

## B.4 Optional tiny waveform / signal animation

Near the Live Morning Brief badge, optionally add:

```txt
3 small vertical bars
or a small waveform line
or an orbit dot
```

Must be subtle.

## B.5 Keep height compact

Target height:

```txt
120px–150px desktop
```

Do not grow the card.

## Acceptance criteria

- Morning Brief feels AI-native and alive.
- Left accent respects rounded corners.
- Motion is subtle.
- No readability issues.
- Reduced-motion users get a static version.
- Delegate is not present in the quick actions.

---

# Section C — Branded Vesta Loading / Initialization Screen

## Goal

Create a short loading experience that makes users feel they are entering Vesta’s AI world.

This should communicate:

```txt
AI
organization
clarity
signal from noise
manager command center
calm intelligence
```

## Name

```txt
Vesta Initialization Screen
```

## Duration

Target:

```txt
1.8–2.5 seconds
```

This is for demo/product feel.

Do not make users wait too long.

## C.1 Visual concept

Centered animated object:

```txt
glowing orbital ring
or luminous AI world circle
or radar/signal sphere
```

Visual elements:

```txt
Vesta logo
orbital halo
subtle wave lines
small organized nodes
soft blue/cyan glow
calm background
```

## C.2 Copy

Use rotating or staged copy:

```txt
Preparing your command center
Organizing today’s signal
Mapping priorities
Loading Vesta
```

Optional final line:

```txt
Your work, in order
```

## C.3 Animation ideas

Allowed:

```txt
slow ring rotation
breathing glow
soft radar sweep
node pulse
subtle wave expansion
progress dots
```

Avoid:

```txt
fast spinning
aggressive neon
high-frequency flicker
large bouncing elements
too many particles
```

## C.4 Implementation suggestion

Create:

```txt
components/loading/VestaLoadingScreen.tsx
```

Possible support files:

```txt
components/loading/OrbitalSignal.tsx
components/loading/LoadingPhrase.tsx
```

Use CSS animations in:

```txt
app/globals.css
```

or a colocated CSS module if the project uses modules.

## C.5 Where to show it

In Phase 0 demo:

```txt
DashboardClient can show it for 1.8–2.5 seconds on initial mount.
```

Later in production:

```txt
use only on first login/session
or during major dashboard initialization
or as skeleton when loading real data
```

## C.6 Reduced motion

If user has:

```txt
prefers-reduced-motion: reduce
```

then:

```txt
show static Vesta logo
show static phrase
skip long animation
reduce duration
```

## C.7 Loading state should not block tests badly

For tests, make sure:

```txt
loading screen can be waited for
or test uses fake timers
or loading duration can be disabled under test env
```

Possible approach:

```ts
const loadingDuration = process.env.NODE_ENV === 'test' ? 0 : 2200;
```

But avoid overcomplicating.

## Acceptance criteria

- Loading screen appears briefly before dashboard.
- It looks compatible with Vesta style.
- It feels futuristic, calm, and organized.
- It does not hurt accessibility.
- It respects reduced motion.
- Dashboard appears correctly after loading.

---

# Section D — Subtle Blue Atmospheric Background

## Goal

Add a soft blue gradient/degradation atmosphere to the main dashboard.

The user should feel depth and AI atmosphere without eye strain.

## D.1 Background style

Use same color family:

```txt
blue
cyan
soft indigo
```

Avoid introducing too many colors.

## D.2 Placement

Add very subtle glows:

```txt
lower center behind Today's Radar
bottom-left or bottom-right bloom
soft glow near AI rail
subtle glow under Ask Vesta
```

## D.3 Implementation options

Use pseudo-elements:

```css
.dashboard-shell::before
.dashboard-shell::after
```

or background layers:

```css
background: radial-gradient(circle at 40% 90%, rgba(...), transparent 40%),
  radial-gradient(circle at 90% 20%, rgba(...), transparent 35%), var(--app-background);
```

## D.4 Rules

Opacity must be low.

The glow must not:

```txt
reduce text contrast
make cards harder to read
look like a random decoration
compete with Today’s Radar
```

## Acceptance criteria

- Dashboard feels more branded.
- Light mode remains clean.
- Dark mode gains depth.
- No readability problems.

---

# Section E — Refine Right AI Assistant Rail

## Goal

Make the AI rail feel more like Vesta’s AI brain.

Do not redesign its structure. Refine it.

## E.1 Keep structure

Keep:

```txt
AI Assistant header
selected work item title
priority metadata
Action / Draft / Memory / Activity tabs
Next Best Action
Why This Matters
action buttons
```

## E.2 Header polish

Add subtle AI status identity:

```txt
LIVE badge
small pulse dot
optional assistant spark/orbit icon
```

Already present elements can be refined.

## E.3 Metadata compression

Current metadata is useful:

```txt
Source
From
Due
Category
```

But it should not feel heavy.

Make metadata:

```txt
smaller
cleaner
less boxed
more integrated
```

## E.4 Next Best Action

This should stay the hero.

Improve it:

```txt
strong recommendation
short reason
primary action button
secondary actions below
```

Potential structure:

```txt
Next Best Action
Approve the draft reply now, or send legal a quick review request.

Why:
Client followed up twice and approval is due today at 4 PM.

[Do this now]
```

## E.5 Action button feedback

When user clicks:

```txt
Do this now
Approve Draft
Ask Legal
Delegate
Snooze
```

show a demo feedback state.

Possible feedback:

```txt
Demo action recorded. Real Outlook actions will be connected in Phase 2.
```

Use:

```txt
toast
small inline confirmation
button state
```

Keep demo-only.

## E.6 Subtle motion

Allowed:

```txt
active tab underline glow
small pulse on LIVE status
soft edge highlight on Next Best Action card
```

Avoid:

```txt
constant movement in text areas
annoying flashing
large looping animation
```

## Acceptance criteria

- Right AI rail feels alive but calm.
- Actions provide demo feedback.
- Metadata is clearer and lighter.
- Rail remains readable in light and dark modes.
- Collapse/expand still works.

---

# Section F — Main Dashboard Motion Polish

## Goal

Add subtle micro-interactions that make the app feel premium.

## F.1 Hover states

Improve hover states for:

```txt
Radar rows
quick action buttons
topbar buttons
sidebar nav
right rail tabs
Ask Vesta button
```

## F.2 Transitions

Use consistent timing:

```txt
150ms–220ms for simple hover
250ms–350ms for panel transitions
```

Use easing:

```txt
ease-out
or custom calm cubic-bezier
```

## F.3 Focus states

Make keyboard focus visible and elegant.

Do not remove outlines without replacement.

## F.4 Reduced motion

All motion must respect:

```css
@media (prefers-reduced-motion: reduce);
```

Set:

```txt
animation: none or greatly reduced
transition: none or minimal
```

## Acceptance criteria

- UI feels smoother.
- Motion is calm.
- Keyboard focus is still visible.
- Reduced-motion users are supported.

---

# Section G — Optional Claude Project Skills

This phase does not require installing skills, but the project can benefit from two small project skills later.

## G.1 Optional skill: Vesta UI Polish

Suggested path:

```txt
.claude/skills/vesta-ui-polish/SKILL.md
```

Purpose:

```txt
Reusable UI polish checklist for Vesta.
```

Do not create unless the workflow will be repeated.

## G.2 Optional skill: Vesta QA Pass

Suggested path:

```txt
.claude/skills/vesta-qa-pass/SKILL.md
```

Purpose:

```txt
Reusable QA checklist for Vesta after UI changes.
```

## G.3 Bundled Claude skills to use

Recommended:

```txt
/run
/verify
/code-review
/debug
```

Use them if available in Claude Code.

---

# Section H — Files Likely to Change

Claude should inspect the repo first, but likely files include:

```txt
app/globals.css
components/dashboard/DashboardClient.tsx
components/dashboard/MorningBrief.tsx
components/dashboard/TodaysRadar.tsx
components/dashboard/WorkItemRow.tsx
components/dashboard/AiAssistantRail.tsx
components/dashboard/CollapsedRail.tsx
components/dashboard/AssistantChat.tsx
components/ui/Chip.tsx
components/ui/Icon.tsx
lib/demo-data.ts
lib/types.ts
```

New files likely:

```txt
components/loading/VestaLoadingScreen.tsx
components/loading/OrbitalSignal.tsx
docs/design/loading-experience-v1.md
docs/design/ai-motion-principles.md
```

Optional:

```txt
components/ui/Toast.tsx
components/ui/DemoActionToast.tsx
```

Only add a toast component if it is simple and useful.

---

# Section I — Testing Requirements

## I.1 Unit/component tests

Update or add tests for:

```txt
loading screen renders
loading screen exits to dashboard
Morning Brief renders with live AI styling
Morning Brief does not contain Delegate
Today’s Radar rows render
Today’s Radar row selection works
Right AI rail updates when selected row changes
Right AI rail action buttons show demo feedback
Theme toggle still works
Ask Vesta still renders
Memory & Rules page still renders
```

## I.2 E2E/smoke tests

If Playwright is available, test:

```txt
dashboard loads
loading screen appears then disappears
Today’s Radar is usable
selecting a ticket updates right rail
right rail buttons show demo feedback
theme toggle works
page scroll works
```

## I.3 Visual QA checklist

Manually check:

```txt
desktop dark mode
desktop light mode
collapsed sidebar
right rail collapsed
Memory & Rules page
Today’s Radar scroll
notification badge
Ask Vesta button
loading animation
reduced motion if possible
```

## I.4 Required commands

Run:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

If available:

```bash
npm run test:e2e
```

If Playwright browser installation is heavy or missing, report it and do not block the phase.

---

# Section J — Documentation Updates

Update:

```txt
docs/product/dashboard-ux-spec.md
docs/design/visual-direction-v2.md
docs/implementation/phases.md
docs/architecture/project-structure.md
```

Create:

```txt
docs/design/loading-experience-v1.md
docs/design/ai-motion-principles.md
```

## J.1 loading-experience-v1.md should include

```txt
purpose
duration
visual concept
copy phrases
animation behavior
reduced-motion behavior
when to show in future production
```

## J.2 ai-motion-principles.md should include

```txt
allowed motion
disallowed motion
Vesta personality
animation timing
reduced-motion rules
readability rules
```

---

# Section K — Acceptance Criteria

Phase 0.5 is complete only if:

```txt
Today’s Radar rows feel less noisy.
Rows are slightly more compact.
Morning Brief has stronger AI identity.
Morning Brief left accent line is fixed.
Delegate is not re-added to Morning Brief.
Vesta loading screen exists and feels AI-native.
Loading screen exits correctly.
Reduced motion is respected.
Main dashboard has subtle blue atmospheric depth.
Right AI rail feels lighter and smarter.
Right AI rail demo action feedback works.
No backend/API/database code is added.
All required tests/checks pass or known limitations are reported.
Docs are updated.
Build succeeds.
```

---

# Section L — Claude Implementation Instruction

Use this instruction after saving this file:

```txt
Read docs/design/phase-0-5-ai-brand-polish-plan.md.

Implement Phase 0.5 exactly as described.

Focus on:
- reducing ticket row visual noise
- AI-style Morning Brief
- fixing the Morning Brief left accent
- branded Vesta loading screen
- subtle AI motion
- calmer atmospheric blue background
- refined right AI rail
- demo-only action feedback

Do not add backend, Supabase, Graph, AI APIs, auth, or migrations.

Update the requested docs and run the required checks.

Report in AGENTS.md format.

Do not commit or push until I review.
```

---

# Section M — AGENTS.md Report Format Expected

Claude should report:

```txt
Summary:
- ...

Files changed:
- ...

Database changes:
- Migration file: none
- Tables changed: none
- Data dictionary updated: n/a
- Generated types updated: n/a

Tests:
- Added/updated:
- Ran:
- Result:

Security notes:
- Secrets exposed? no
- Backend/API/database changes? no
- RLS changed? no

Known issues:
- ...

Screenshots/local URL:
- ...

Next recommended task:
- ...
```

---

## Final Note

This phase should make Vesta feel more memorable.

The target feeling:

```txt
Vesta is not just a dashboard with AI features.
Vesta feels like an AI command center for organizing a manager’s work.
```

Do not overdo the visuals.

The best result is:

```txt
calm, glowing, intelligent, organized, and easy to use.
```
