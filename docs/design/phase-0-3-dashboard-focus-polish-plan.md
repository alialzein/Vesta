# Phase 0.3 — Dashboard Focus & Simplicity Polish Plan

**Project:** Vesta AI Chief of Staff  
**Phase:** 0.3  
**Status:** Planned  
**Scope type:** Frontend/demo-only UI refinement  
**Recommended branch:** `feature/phase-0-3-dashboard-focus`  
**Target file path:** `docs/design/phase-0-3-dashboard-focus-polish-plan.md`

---

## 1. Purpose

The dashboard is visually strong after Phase 0.1, but the main work queue is no longer focused enough. Too many large sections appear before `Today’s Radar`, which makes the page feel busy and pushes the actionable tickets too far down.

This phase simplifies the dashboard so a manager can open Vesta and immediately understand:

1. What is the biggest risk today?
2. How much decision/follow-up pressure exists?
3. Which exact tickets need action?
4. What should be done next for the selected ticket?

The guiding principle for this phase is:

> **Work first. Intelligence second. News later.**

---

## 2. Current Problems to Fix

### 2.1 Too much vertical weight above Today’s Radar

The dashboard currently has several large sections before the main ticket list:

- Greeting/top area.
- Large Morning Brief.
- Large urgency ring.
- Large AI Command Center gradient cards.
- Full KPI card row.
- Then `Today’s Radar`.

This makes the dashboard impressive, but less focused.

### 2.2 Repeated information

The same urgency/priority information appears in multiple places:

- Morning Brief urgency ring.
- Selected row priority score.
- Right AI Assistant Rail priority score.

This is visually repetitive. The score is useful, but should not dominate the top of the page.

### 2.3 AI Command Center duplicates other actions

The large command cards are beautiful, but their functions overlap with existing Morning Brief actions:

- `Clear My Day` overlaps with `Start Focus Mode`.
- `Delegate Work` overlaps with `Show Delegation Ideas`.
- `Clean Inbox` is a later feature and should not be a main dashboard card yet.
- `Meeting Prep` is useful, but does not need a large card on the main Today page.

### 2.4 KPI cards are too large

The KPI cards are useful, but the six-card layout consumes too much vertical space.

### 2.5 Manager should not feel noise

The dashboard should be easy on the eyes and should not force the manager to process too many visual elements before reaching the actual work items.

---

## 3. Final Target Layout

The simplified Today dashboard should follow this hierarchy:

```txt
Topbar
Compact Morning Brief
Compact Metrics Strip
Today's Radar
Right AI Assistant Rail
Ask Vesta entry point
```

Recommended desktop layout:

```txt
┌────────────────────────────────────────────────────────────────────┐
│ Topbar: Search | Outlook status | Alerts | Settings | User         │
├──────────────────────────────────────────────────────┬─────────────┤
│ Compact Morning Brief                                │ AI Rail     │
│ “One blocker is putting a client relationship at risk”│             │
│ [Clear My Day] [Draft Replies] [Delegate] [Meeting Prep]           │
├──────────────────────────────────────────────────────┤             │
│ Compact Metrics Strip                                │             │
│ Decision Debt | People Blocked | Follow-up Risk | Drafts Ready     │
├──────────────────────────────────────────────────────┤             │
│ Today’s Radar                                        │             │
│ Main actionable work tickets                         │             │
└──────────────────────────────────────────────────────┴─────────────┘
```

The manager should see `Today’s Radar` early on a normal laptop screen without feeling the page is overloaded.

---

## 4. Hard Scope Limits

This phase is UI/demo only.

Do **not** add:

- Supabase integration.
- Microsoft Graph integration.
- OpenAI or any AI API calls.
- Real authentication.
- Real database migrations.
- Real email sending.
- Real notifications.
- New secrets or environment variables.

Keep:

- Demo data only.
- Demo data isolated in `lib/demo-data.ts`.
- TypeScript strict.
- Existing visual direction and token system.
- Light mode and dark mode working.
- Existing right AI rail concept.

---

## 5. Detailed UI Changes

## 5.1 Make Today’s Radar the main focus

### Goal

`Today’s Radar` should feel like the primary section of the page.

### Requirements

- Move `Today’s Radar` higher by reducing sections above it.
- Increase its available vertical space.
- Keep filtering and selection behavior.
- Keep selected row connected to the right AI Assistant Rail.
- Ensure the first several work items are visible on a laptop screen.

### Acceptance Criteria

- On desktop/laptop, the manager can see at least the top of `Today’s Radar` without scrolling too much.
- The dashboard clearly communicates that tickets/work items are the main focus.
- No large decorative sections distract from the work list.

---

## 5.2 Compact the Morning Brief

### Current Issue

The Morning Brief is valuable but too tall. It also contains a large urgency visualization that duplicates the row and rail priority score.

### New Structure

The Morning Brief should become a compact card with:

- `Live Morning Brief` badge.
- Main sentence:

```txt
One blocker is putting a client relationship at risk.
```

- One concise summary line.
- A small chip:

```txt
Top risk: 92
```

- Compact quick action buttons:

```txt
Clear My Day
Draft Replies
Delegate
Meeting Prep
```

### Remove or Shrink

- Remove the large urgency ring from the Morning Brief.
- Do not show a large 92 circle inside the brief.
- Do not include a large secondary visualization that pushes content down.

### Target Height

Desktop target height:

```txt
120px to 150px
```

### Acceptance Criteria

- Morning Brief is short and clear.
- It still feels important, but does not dominate the page.
- It contains quick actions without taking a full extra section.

---

## 5.3 Replace AI Command Center with compact quick actions

### Current Issue

The large AI Command Center gradient cards look good but take too much space on the main Today page.

### New Direction

Move the actions into the compact Morning Brief or a small quick actions strip.

### Keep Actions

```txt
Clear My Day
Draft Replies
Delegate
Meeting Prep
```

### Move or Hide

```txt
Clean Inbox
```

`Clean Inbox` should become:

- A future placeholder.
- A secondary action.
- A command in `Ask Vesta`.
- Or a feature for a future page, not a large card on the Today dashboard.

### Implementation Recommendation

Do not delete `AiCommandCenter.tsx` if it may be useful later. Instead:

- Remove it from the main dashboard render.
- Keep the component for future use.
- Add a comment explaining it is reserved for a future page or expanded action mode.
- Optional: use a demo feature flag constant such as:

```ts
const SHOW_LARGE_COMMAND_CENTER = false;
```

Only use the flag if the project already has a clean pattern for demo feature flags.

### Acceptance Criteria

- Large AI Command Center cards no longer appear on the main Today dashboard.
- Quick actions remain available in compact form.
- Main dashboard becomes shorter and less noisy.

---

## 5.4 Convert KPI cards into a compact metrics strip

### Current Issue

Six large KPI cards take too much vertical space.

### New Structure

Use a compact horizontal metrics strip.

Primary visible metrics:

```txt
Decision Debt
People Blocked
Follow-up Risk
Drafts Ready
```

Secondary small metrics:

```txt
Promises at Risk
Time to Clear
```

### Visual Direction

- Smaller than the current KPI card row.
- Still readable.
- Use compact icons.
- Use strong number hierarchy.
- Use subtle colored chips or small indicators.
- Keep hover/focus states.
- Avoid a heavy grid of large cards.

### Example Layout

```txt
Decision Debt 5  |  People Blocked 8  |  Follow-up Risk 3  |  Drafts Ready 4  |  Promises 2  |  Clear in 1.5h
```

### Acceptance Criteria

- Metrics consume much less height than the current cards.
- Manager can scan the numbers quickly.
- The strip supports the Radar instead of competing with it.

---

## 5.5 Reduce repeated priority display

### Keep Priority In

- `Today’s Radar` row.
- Right AI Assistant Rail.

### Change Priority In

- Morning Brief should only show compact `Top risk: 92` chip.
- Remove the big ring/large visualization from the main top area.

### Acceptance Criteria

- Priority score remains visible where useful.
- The page no longer feels like it is repeating the same number everywhere.

---

## 5.6 Clean topbar/profile redundancy

### Current Issue

The user profile appears in multiple places or creates a busy header.

### Preferred Direction

- Keep the user avatar/profile in the top-right topbar.
- Avoid a separate large profile card under the header.
- Sidebar footer profile may remain only if it is subtle and not duplicative.

### Topbar Should Include

- Search.
- Outlook status.
- Notifications.
- Settings.
- Theme toggle.
- AI rail toggle.
- User avatar/profile.

### Acceptance Criteria

- User profile appears clearly but not repeatedly.
- Header feels clean and professional.

---

## 5.7 Keep the right AI Assistant Rail

### Direction

Do not remove the right rail. It is important because it makes Vesta feel intelligent and action-focused.

### Role

The rail should explain the selected `Today’s Radar` item and propose the next action.

### It Should Focus On

- Next Best Action.
- Why this matters.
- Draft.
- Memory/rules used.
- Activity/follow-up history.

### Avoid

- Repeating every field already visible in the row.
- Being visually heavier than the main ticket list.
- Becoming another dashboard inside the dashboard.

### Acceptance Criteria

- Selecting a Radar item updates the rail.
- The rail remains useful but does not compete with Today’s Radar.
- The rail can still collapse/expand.

---

## 5.8 Improve Today’s Radar row clarity

Each row should answer these quickly:

```txt
Who?
What?
Why urgent?
What action?
When due?
```

### Row Should Show

- Priority score.
- Title.
- Source.
- Sender/person if available.
- Short reason.
- Category chips.
- Suggested action if available.
- Due/status.

### Keep Rows Compact

Do not make rows too tall. The manager should be able to see multiple tickets at once.

### Acceptance Criteria

- Rows are more readable.
- Rows remain compact.
- Selected state is clear.
- Row selection still updates the right rail.

---

## 5.9 Ask Vesta placement

### Direction

`Ask Vesta` should remain available, but it should not compete with the right AI rail.

### Difference Between Rail and Chat

```txt
Right AI Rail = selected item explanation and actions.
Ask Vesta = free-form questions and commands.
```

### Optional Improvement

When the AI rail is open, `Ask Vesta` can be smaller or visually less dominant.

---

## 6. Responsive Requirements

Verify these states:

- Large desktop.
- Laptop.
- Tablet.
- Mobile.
- Collapsed left sidebar.
- Collapsed right AI rail.
- Right rail stacked/drawer behavior.

### Mobile Direction

- Sidebar should become drawer/collapsible.
- Right AI rail should become drawer, modal, or stacked section.
- Today’s Radar should remain the main content.
- Metrics strip should wrap cleanly.
- Compact Morning Brief should not become oversized.

---

## 7. Demo Data Requirements

Keep all demo data in:

```txt
lib/demo-data.ts
```

If new fields are needed, update:

```txt
lib/types.ts
```

Recommended additions if missing:

```ts
type WorkItem = {
  id: string;
  title: string;
  source: 'outlook' | 'teams' | 'manual' | 'calendar';
  senderName?: string;
  relatedPerson?: string;
  priorityScore: number;
  category: string;
  reason: string;
  suggestedAction?: string;
  dueLabel?: string;
  followUpCount?: number;
  isDecision?: boolean;
  isBlocker?: boolean;
  canDelegate?: boolean;
};
```

Do not add backend fields unless needed by the frontend demo.

---

## 8. Testing Plan

Update or add tests for the simplified dashboard.

### 8.1 Unit Tests

Recommended unit tests:

- `priorityBand` still works.
- `filterWorkItems` still works with updated filters.
- New metric derivation function if created.
- Demo data has required fields for every work item.

### 8.2 Component Tests

Add/update tests for:

- Dashboard renders.
- Compact Morning Brief renders.
- Quick actions render.
- Metrics strip renders.
- Large AI Command Center cards are not shown on main dashboard.
- Today’s Radar renders and remains the main content.
- Today’s Radar filters work.
- Selecting a Radar item updates the right AI Assistant Rail.
- Right rail tabs still switch.
- Right rail collapse/expand still works.
- Theme toggle still works.
- Sidebar collapse still works.

### 8.3 E2E Tests

If Playwright browsers are installed, update or add:

1. Dashboard loads.
2. User selects a Radar item.
3. Right AI rail updates.
4. User toggles theme.
5. User collapses sidebar.
6. User collapses right rail.
7. Quick action button shows demo behavior or expected placeholder.

If browser install is not available, report the reason and do not block Phase 0.3.

### 8.4 Required Commands

Run:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

If Playwright browsers are installed:

```bash
npm run test:e2e
```

---

## 9. Documentation Updates

Update these files:

```txt
docs/product/dashboard-ux-spec.md
docs/design/visual-direction-v2.md
docs/implementation/phases.md
```

Add this file to the repository:

```txt
docs/design/phase-0-3-dashboard-focus-polish-plan.md
```

If `AiCommandCenter.tsx` remains in the code but is not used on the Today page, mention this in:

```txt
docs/architecture/project-structure.md
```

---

## 10. Acceptance Criteria

Phase 0.3 is complete when:

- Dashboard feels simpler and easier on the eyes.
- `Today’s Radar` is clearly the main focus.
- Morning Brief is compact.
- Large AI Command Center cards are removed from the main Today page or hidden.
- Quick actions remain available in compact form.
- KPI cards are replaced by a compact metrics strip.
- Priority score repetition is reduced.
- Topbar/profile duplication is cleaned.
- Right AI Assistant Rail remains contextual and collapsible.
- Today’s Radar rows are clearer but not too tall.
- Light mode and dark mode both work.
- No backend/API/database code is added.
- Tests pass.
- Build succeeds.

---

## 11. AGENTS.md Report Format

When the coding agent finishes, it must report:

```txt
Summary:
- What changed and why.

Files changed:
- List added, modified, and removed files.

Database changes:
- Migration file: none expected.
- Tables changed: none expected.
- Data dictionary updated: n/a unless docs changed.

Tests:
- Tests added/updated.
- Commands run.
- Results.

Security notes:
- Confirm no secrets were added.
- Confirm no backend/API/database code was added.

Known issues:
- Anything not completed or needing review.

Screenshots/local URL:
- Provide local URL and screenshot notes if available.

Next recommended task:
- Usually Phase 1 database foundation, unless UI review still needs fixes.
```

---

## 12. Suggested Instruction to Coding Agent

Use this short instruction after adding this file:

```txt
Read docs/design/phase-0-3-dashboard-focus-polish-plan.md and implement Phase 0.3 exactly as described.
Do not start backend, Supabase, Graph, AI API, auth, or database work.
After implementation, run the required checks and report in AGENTS.md format.
Do not commit or push until I review the result.
```
