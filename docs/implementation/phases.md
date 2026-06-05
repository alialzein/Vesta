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
