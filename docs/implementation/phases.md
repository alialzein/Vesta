# Implementation Phases

Build one phase at a time. Do not skip ahead.

## Phase 0 — Dashboard Shell and Project Foundation

Status: **Done.** Next.js + Tailwind app scaffolded; Arctic Frost mockup ported
into reusable components fed by `lib/demo-data.ts`; unit/component/E2E tests
added; runs locally. See `docs/architecture/project-structure.md`.

Goal:

- Convert current HTML dashboard into clean Next.js components.
- Keep demo data separate from future database code.
- Establish project structure, linting, formatting, and deployment.

Deliverables:

- App runs locally.
- Dashboard renders with placeholder data.
- Components are separated.
- Docs copied into project.

Do not implement:

- Microsoft Graph.
- AI API calls.
- Database sync.

### Phase 0.1 — Dashboard Polish

Status: **Done.** Premium light SaaS refresh of the Phase 0 dashboard (still
demo-only — no Supabase, Graph, AI, auth, migrations, or secrets):

- Redesigned light theme palette; dark mode preserved.
- Topbar utility toolbar (search, Outlook status, bell, settings, theme, AI-rail
  toggle, avatar, mobile hamburger).
- AI Command Center gradient cards (Clear My Day, Meeting Prep, Delegate Work,
  Clean Inbox).
- Six manager-focused KPI cards.
- Sidebar split into header/nav/footer; collapse no longer overlaps the logo.
- Contextual AI Assistant Rail with Action/Draft/Memory/Activity tabs, collapsible
  to a 64px icon strip; stacks on small screens.
- Polished Today's Radar (more filters), Morning Brief, and responsive behavior.

See `docs/design/visual-direction-v2.md`.

### Phase 0.2 — Demo Interactions (interim)

Status: **Done (superseded by 0.3 layout).** Added presentation-ready demo
behavior on top of 0.1, still demo-only:

- Light theme made the default; dark mode preserved.
- Toast system (`components/ui/Toast.tsx`) for demo action feedback.
- Reusable UI states (`components/ui/StateView.tsx`): empty radar, loading,
  Outlook not connected, AI unavailable, no memories, no drafts.
- Shared `Drawer` + preview drawers: Focus Mode, Meeting Prep, Clean Inbox.
- Controllable Today's Radar filter; richer rows (sender + suggested action).
- Right rail: clearer item context + action buttons that show demo feedback.

### Phase 0.3 — Dashboard Focus & Simplicity Polish

Status: **Done.** Simplified the Today page so the work queue is the focus
(plan: `docs/design/phase-0-3-dashboard-focus-polish-plan.md`). Still demo-only:

- Compact Morning Brief: badge + headline + one summary line + a small
  "Top risk" chip + four quick actions (Clear My Day, Draft Replies, Delegate,
  Meeting Prep). The large urgency ring was removed to stop repeating the score.
- Large AI Command Center cards removed from the Today page (component kept,
  gated behind `SHOW_LARGE_COMMAND_CENTER = false` for a future page).
- Six KPI cards replaced by a compact `MetricsStrip` (4 primary + 2 secondary).
- Today's Radar promoted; reachable earlier on a laptop screen.
- "Ask Vesta" FAB becomes compact (icon-only) while the AI rail is expanded.

See `docs/demo/demo-behavior.md` for what is real vs. placeholder.

### Phase 0.4 — Final UI/UX Fixes

Status: **Done.** A focused fix pass (no redesign), still demo-only. Plan/details:
`docs/design/final-ui-fixes-phase-0-4.md`.

- Topbar: removed the standalone "AI" button (rail toggle is now icon-only),
  profile chip shows avatar + name, Outlook status simplified to "Connected".
- Fixed the notification badge clipping and the "Good morning, Ali" italic clip.
- Right AI rail gets a light-mode tint (`--rail-bg`) so it doesn't merge with cards.
- Removed "Delegate" from the Morning Brief quick actions (kept in Radar + rail).
- Memory & Rules rebuilt as a full-page workspace (header, add form, category
  tabs, list, side help panel).
- Fixed Today's Radar scrolling (viewport-constrained grid rows + `min-h-0`).

## Phase 1 — Database Foundation

Goal:

- Create Supabase schema, RLS, indexes, and documentation.

Deliverables:

- Migrations for all foundation tables.
- Data dictionary updated.
- Portability rules applied.
- Generated DB types.

## Phase 2 — Auth and Profile

Goal:

- Manager can log in and has a profile.

Deliverables:

- Supabase auth session.
- Profile table integration.
- Protected dashboard route.

## Phase 3 — Microsoft Outlook Connection

Goal:

- Manager can connect Outlook through Microsoft Graph OAuth.

Deliverables:

- OAuth start/callback.
- Secure token storage.
- Integration settings card.
- Graph `/me` test.

## Phase 4 — Initial Email Sync

Goal:

- Sync recent Inbox and Sent Items.

Deliverables:

- Email messages stored.
- Threads created.
- People extracted.
- Basic work items created.

## Phase 5 — Delta Sync, Webhooks, and Queues

Goal:

- Keep Outlook data current.

Deliverables:

- Graph webhook endpoint.
- Delta sync cursors.
- Scheduled fallback sync.
- Queue processing.
- Subscription renewal.

## Phase 6 — Thread and Follow-up Engine

Goal:

- Detect waiting-on-manager, waiting-on-other, repeated follow-ups, and basic urgency.

Deliverables:

- Pure TypeScript thread calculator.
- Unit tests.
- Work item updates.
- Dashboard categories.

## Phase 7 — AI Analysis

Goal:

- AI summarizes, classifies, prioritizes, detects deadlines, and suggests actions.

Deliverables:

- Prompt contracts.
- Output schemas.
- AI analysis queue.
- Work item AI fields.
- Cost/token tracking.

## Phase 8 — Manual Tasks and Reminders

Goal:

- Manager can add tasks manually and get reminders.

Deliverables:

- Quick add task.
- AI task parser.
- Reminder table.
- Reminder processor.
- Snooze/done.

## Phase 9 — Draft Replies

Goal:

- Manager can generate, edit, approve, and send draft replies.

Deliverables:

- Draft editor.
- Draft generation prompt.
- Approval flow.
- Send through Graph.
- Audit logs.

## Phase 10 — Memory and Rules

Goal:

- Manager can teach Vesta preferences.

Deliverables:

- Memory/rules UI.
- VIP senders.
- Delegation rules.
- Tone preferences.
- Memory approval flow.
- Memory retrieval in AI analysis/drafting.

## Phase 11 — Daily Brief and Focus Mode

Goal:

- Morning brief and Clear My Day flow.

Deliverables:

- Daily brief generator.
- Brief card.
- Focus queue.
- Suggested first action.
- Dashboard polish.

## Phase 12 — New Differentiating Features

Goal:

- Add manager-dream features.

Deliverables:

- AI Decision Desk.
- Promise and Commitment Tracker.
- Strong Focus Mode.
- Relationship Risk Heatmap later.

## Phase 13 — Teams Later

Goal:

- Teams notifications first, Teams message ingestion later.

Deliverables:

- Teams brief/reminder notifications.
- Bot mentions.
- Selected chats/channels if approved.

## Phase 14 — Multi-user/Company Expansion Later

Goal:

- Support multiple managers.

Deliverables:

- Organization tables.
- Admin consent flow.
- Privacy-safe department analytics.
- Tenant isolation.
