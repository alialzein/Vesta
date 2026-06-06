# Dashboard UX Specification

## Purpose

The dashboard is the manager's daily command center. It should not look or behave like another inbox.

## Current design direction

> **Updated in Phase 0.1–0.3.** The dashboard ships a **premium light SaaS** theme
> by default (intentionally designed, not an inverted dark theme) with dark mode
> preserved. The right panel is a **Contextual AI Assistant Rail** with
> Action/Draft/Memory/Activity tabs. **Phase 0.3** then made the Today page
> work-first: the Morning Brief is **compact** (no large urgency ring), the six KPI
> cards became a **compact metrics strip**, and the large **AI Command Center**
> cards were removed from the Today page (the four actions live as compact quick
> actions in the brief). Guiding principle: _work first, intelligence second, news
> later_. **Phase 0.4** added final fixes: an icon-only AI-rail toggle (no separate
> "AI" button), a profile chip with name, a simplified "Outlook Connected" status,
> a tinted light-mode AI rail, Delegate removed from the brief, a **full-page**
> Memory & Rules workspace, and a Today's Radar scroll fix. Details:
> `docs/design/visual-direction-v2.md`,
> `docs/design/phase-0-3-dashboard-focus-polish-plan.md`,
> `docs/design/final-ui-fixes-phase-0-4.md`, and `docs/demo/demo-behavior.md`.

The visual direction is strong:

- Light SaaS executive dashboard with an optional dark mode.
- Left navigation (collapsible; collapse never overlaps the logo).
- Topbar utility toolbar (search, Outlook status, notifications, settings, theme,
  AI-rail toggle, profile).
- Compact Morning Brief with a "Top risk" chip and quick actions.
- Compact metrics strip (Decision Debt, People Blocked, Follow-up Risk, Drafts
  Ready, + Promises / Time to Clear).
- Today's Radar list — the primary, focal section.
- Right Contextual AI Assistant Rail.
- Manager Memory panel.

Keep this direction.

## Recommended layout

```txt
┌────────────────────────────────────────────────────────────────────┐
│ Left Nav │ Header: greeting, search, command bar, theme/status      │
│          ├─────────────────────────────────────────────────────────┤
│          │ Morning Brief + Focus Mode       │ Priority / Time Ring  │
│          ├─────────────────────────────────────────────────────────┤
│          │ KPI Cards: Decisions, Blockers, Follow-ups, Promises... │
│          ├──────────────────────────────────────┬──────────────────┤
│          │ Today's Radar                         │ AI Analysis      │
│          │ - grouped work items                  │ Draft / Actions  │
│          │ - filters                             │ Memory & Rules   │
└──────────┴──────────────────────────────────────┴──────────────────┘
```

## Header

Include:

- Greeting.
- Current day/date.
- Search.
- Assistant command bar.
- Integration status.
- Theme toggle if needed.

Example command bar placeholder:

```txt
Ask Vesta to create a task, set a reminder, draft a reply, or remember a rule...
```

## Morning Brief Card

Must answer:

```txt
What is the biggest risk today?
What should I do first?
How many items are truly critical?
```

Buttons:

```txt
Start Focus Mode
Generate Reply Drafts
Show Delegation Ideas
```

## KPI Cards

Use these cards for the strong pilot:

```txt
Decision Debt
People Blocked
Follow-up Risk
Promises at Risk
Drafts Ready
Time to Clear
```

Each card should be clickable and filter Today's Radar.

## Today's Radar

This is the main work queue.

Filters:

```txt
All
Decisions
Blockers
Follow-ups
Promises
Can delegate
Drafts
FYI
```

Each row/card should show:

```txt
Priority score
Title
Source: Outlook / Teams / Manual / AI Commitment
Short summary
Tags
Due date or age
Suggested next action
```

Actions on hover or expanded state:

```txt
Open
Draft reply
Delegate
Set reminder
Snooze
Mark done
Teach AI
Not urgent
```

## Contextual AI Assistant Rail (formerly "AI Analysis Panel")

Tabbed (Action / Draft / Memory / Activity) and contextual to the selected
Today's Radar item. Must include:

```txt
Item title
Priority score
Why urgent
Detected risks
Next best action
Suggested draft
Action buttons
Confidence
Source link
```

Do not show hidden chain-of-thought. Show only concise user-visible reasoning.

## Manager Memory Panel

Sections:

```txt
Add rule / memory
Active rules
Pending AI suggestions
Recent learning
```

Memory chips:

```txt
VIP
Tone
Delegate
Never
Project
Company
```

## Focus Mode Page/Drawer

The Focus Mode should simplify the dashboard into one item at a time.

Sections:

```txt
Current item
Recommended action
Draft or decision panel
Next queue
Completed in this session
```

Focus Mode goal:

> Clear the highest-risk work with the fewest decisions.

## Empty states

Examples:

```txt
No urgent follow-ups. Your critical queue is clear.
```

```txt
No memories yet. Teach Vesta who is VIP or how you prefer replies.
```

## Safety copy

Use these sentences in the UI:

```txt
AI drafted this reply. Please review before sending.
```

```txt
This priority was generated by AI and rules. Correct it to teach Vesta.
```

```txt
Vesta will not send emails automatically unless you explicitly enable that later.
```

```txt
This memory affects future prioritization. You can edit or delete it anytime.
```
