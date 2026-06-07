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

### Phase 0.5 — AI Brand Polish, Motion & Loading

Status: **Done.** A polish pass (no redesign), still demo-only. Plan/details:
`docs/design/phase-0-5-ai-brand-polish-plan.md`,
`docs/design/loading-experience-v1.md`, `docs/design/ai-motion-principles.md`.

- Today's Radar rows reduced "boxes-in-boxes": softer single-surface rows, quieter
  source/category/action chips, slightly more compact, cleaner selected glow.
- Morning Brief upgraded into a live AI signal card: pulsing live dot + ripple,
  tiny signal waveform, low-opacity drifting shimmer, and a left accent that now
  respects the rounded corner (card `overflow-hidden`). No Delegate added.
- New branded **Vesta initialization screen** (`components/loading/`): orbital AI
  signal sphere, rotating copy, ~1.8s then fade-out. Demo-only; 0ms under test;
  reduced-motion safe.
- Subtle blue **atmospheric background** (`.dashboard-atmosphere` + `--atmos-*`),
  kept very low opacity so light mode stays clean and text contrast is unaffected.
- Right AI rail refined: LIVE pulse + ripple, lighter priority metadata.
- Calm AI motion (`vesta-*` keyframes), global `:focus-visible` ring, and full
  `prefers-reduced-motion` support.

#### Phase 0.5 revision

The first 0.5 pass was too subtle and the splash rendered see-through. The revision:

- **Dark mode is now the default theme** (stronger brand); light is still toggleable.
- **Rebuilt the loading screen** as a true full-screen, **opaque** `VestaSplashScreen`
  (`components/dashboard/`): orbital rings + traveling nodes + radar sweep +
  breathing core + grid + progress, played **on every full page load**,
  `SPLASH_DURATION_MS ≈ 1800`, 0ms in test, reduced-motion safe, `data-testid`s.
  (Root cause of the old transparency: a solid color inside `background-image`.)
- Promoted the atmosphere to a `DashboardAtmosphere` component (blue/cyan blooms +
  faint masked grid), more present in dark mode.
- Radar rows pushed further: borderless-until-hover, borderless priority tint and
  chips — one clean surface.
- AI rail: active-tab glow + a calm scanning shimmer on Next Best Action.

#### Phase 0.5 final polish

- **Removed the grid from behind the work list.** Dark-mode card surfaces are now
  **opaque** (`--panel` solid dark-blue) and the atmosphere **grid was removed**
  from the dashboard (it read as graph paper behind tickets) — only soft radial
  blooms remain in the shell background; a grid lives only on the splash. Rule:
  no grid/pattern behind Today's Radar, work rows, Morning Brief text, or rail
  text cards.
- Today's Radar reads as a calm solid surface; selected row keeps blue tint + left
  cyan accent (no pattern).
- **Splash refined** (not replaced): soft radial field, 5 orbiting nodes, a small
  live equalizer, brighter tagline, branded cyan→mint progress bar, better spacing.
  `SPLASH_DURATION_MS ≈ 1800` (tuned interactively).

## Phase 1 — Database Foundation

Goal:

- Create Supabase schema, RLS, indexes, and documentation.

Deliverables:

- Migrations for all foundation tables.
- Data dictionary updated.
- Portability rules applied.
- Generated DB types.

## Phase 2 — Auth and Profile

Status: **Done.** Email/password auth via Supabase (`@supabase/ssr`), middleware
session refresh + route protection, `/login` (sign-in/sign-up) + `/auth/callback`,
a `profiles` auto-create trigger on signup, sign-out in the sidebar, and the
dashboard greeting/profile sourced from the signed-in account. Live DB test
covers the trigger; component test covers the auth form.

Login AI brand polish (`feature/login-ai-polish`): a small animated Vesta signal
core, subtle AI background atmosphere, refined card/inputs (focus glow, leading
icons), a premium loading button (rotating copy → splash hand-off), confirm-password
on sign-up, and trust cues — reduced-motion safe. A second polish pass added
**"Continue with Microsoft"** as the primary CTA (demo-only; real OAuth is Phase 3),
an "or use email" divider with email/password as the secondary option, an
"AI workspace ready" status chip, and a slightly larger orb. See
`docs/design/login-experience-v1.md`.

**Decision:** the login Microsoft button is **sign-in / SSO only**. Connecting the
Outlook **mailbox** for email is a separate **"Connect Outlook"** step in
Settings/onboarding (Microsoft Graph OAuth — not SMTP/IMAP), planned for Phase 3.
The login screen states this explicitly so the two are not confused.

**Expanded direction.** Login is multi-provider (email/password + Google +
Microsoft SSO via Supabase Auth), a first-run **onboarding tour** collects
personality/preferences into `manager_memories` (+ briefing preferences), and the
mailbox layer supports **both OAuth (Outlook, then Gmail; auto-refreshed) and
IMAP**, kept separate from login. Full plan:
`docs/product/auth-onboarding-and-mailbox-plan.md`.

### Phase 2b — SSO login providers (in progress)

Status: **Code done; pending provider config.** "Continue with Microsoft" and
"Continue with Google" call `supabase.auth.signInWithOAuth` and redirect to
`/auth/callback`; they degrade gracefully until each provider is enabled in
Supabase. Setup steps: `docs/architecture/auth-providers-setup.md`. SSO is
identity-only — mailbox connection is separate (Phase 3).

### Phase 2c — First-run onboarding wizard

Status: **Done.** A short, skippable full-screen wizard at `/onboarding`
(role → tone → VIPs → topics → connect-mailbox placeholder). On finish it saves
the answers as the user's own `manager_memories` (approval-first; no AI) and sets
`profiles.role`; finish/skip stamps `profiles.onboarded_at`. The dashboard
redirects first-run users (`onboarded_at` null) to `/onboarding`; an onboarded
user visiting `/onboarding` is sent to the dashboard. Migration
`20260606160001_add_profiles_onboarded_at.sql`.

**Dev user:** `scripts/create-dev-user.mjs` marks the dev test user
(`dev@vesta.app`) onboarded, so it skips the wizard and lands on the demo-data
dashboard for testing — real users still see onboarding. Component tests cover the
wizard; the dashboard e2e (dev user) is unaffected. Then Phase 3 (Connect Outlook).

Testing: a **Playwright auth fixture** (`e2e/auth.setup.ts`) signs a shared dev
test user in and saves `storageState`, so the auth-protected dashboard e2e runs
authenticated while the login e2e runs logged-out. The dev account is created via
`node scripts/create-dev-user.mjs` (creds in `.env.local`). **Temporary for dev:
remove the dev user and re-enable Supabase "Confirm email" before launch.**

Goal:

- Manager can log in and has a profile.

Deliverables:

- Supabase auth session.
- Profile table integration.
- Protected dashboard route.

## Phase 3 — Microsoft Outlook Connection

Status: **Code done; pending Azure app config.** Microsoft Graph OAuth
(authorization-code flow) to connect an Outlook mailbox — **separate from login**.
ONE Azure app serves all users; each gets their own encrypted, auto-refreshed
token pair. Setup guide: `docs/architecture/outlook-connect-setup.md`.

- `GET /api/outlook/connect` (CSRF state) → Microsoft; `GET /api/outlook/callback`
  exchanges the code, reads `/me`, upserts `user_integrations` + `mailboxes`, and
  stores encrypted tokens in `private.graph_tokens` via service-role SECURITY
  DEFINER RPCs (migration `20260606170001_graph_token_rpcs.sql`).
- `lib/graph/*`: AES-256-GCM token crypto, OAuth (authorize/exchange/refresh),
  `/me` client, and `getValidAccessToken` (auto-refresh → "stays connected").
- Settings page (`/settings`, linked from the topbar gear) with an Outlook card:
  Connect / Test connection / Disconnect + status. Degrades gracefully until the
  Microsoft app keys are set. Unit tests cover crypto, the authorize URL, and
  token-expiry logic.

Goal:

- Manager can connect Outlook through Microsoft Graph OAuth.

Deliverables:

- OAuth start/callback.
- Secure token storage.
- Integration settings card.
- Graph `/me` test.

## Phase 4 — Initial Email Sync

Status: **Done (Outlook).** A bounded initial sync pulls recent **Inbox + Sent**
via Microsoft Graph and stores real data — **no schema change** (writes into the
Phase 1 tables via their existing unique constraints).

- `lib/graph/mail.ts` fetches recent messages; `lib/sync/outlook.ts` has pure
  builders (message/thread/people rows — unit tested) + an orchestrator that
  idempotently upserts `email_threads`, `email_messages`, `people` and records a
  `sync_cursors` row (auth'd client → RLS own-rows; tokens auto-refreshed).
- Trigger: **Settings → "Sync now"** (server action `syncOutlook`), shows a result
  summary. (Auto/delta/background sync is Phase 5.)
- Surface: a real **Inbox** view (`/inbox`, linked from the sidebar) listing recent
  synced messages, with an empty state. The Today dashboard stays demo until
  Phase 6/7 enrich work items.
- **Deviation (documented):** `work_items` creation is **deferred to Phase 6**
  (the follow-up engine), where items get real categories/priority — creating bare
  ones now would be unused.
- E2E now runs against a **production build** (`next build && next start`) for
  deterministic, non-flaky runs (dev compiled routes on-demand).

Deliverables:

- Email messages stored.
- Threads created.
- People extracted.
- Basic work items created (deferred to Phase 6 — see above).

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

Status: **Done.** A pure thread calculator turns synced messages into real
`work_items` — **no schema change** (writes into the Phase 1 `work_items` table
via code-level dedup keyed by `(mailbox_id, source='outlook', source_external_id)`).

- `lib/engine/threads.ts` — pure, unit-tested calculator:
  `computeThreadState` (latest direction → `is_waiting_on_manager` /
  `is_waiting_on_other`, inbound-after-last-outbound count, `followup_count`),
  `scoreThread` (heuristic 0–100: waiting base + recency + follow-up pressure +
  VIP, clamped), `categorizeThread` (`waiting` | `followup` | `fyi`).
- `lib/sync/outlook.ts` now writes thread flags onto `email_threads` and creates/
  updates `work_items` for conversations **waiting on the manager**, each with a
  human `urgency_reason`. The heuristic priority is refined by AI in Phase 7.
- Surface: a real **Priorities** view (`/priorities`, sidebar "Waiting on Me")
  ordered by priority with category/band badges, reason, and an empty state
  ("Nothing waiting on you"). Settings → "Sync now" reports the count.

Deliverables:

- Pure TypeScript thread calculator. ✅
- Unit tests (engine + `buildWorkItemDrafts`). ✅
- Work item updates (created/updated from waiting-on-manager threads). ✅
- Dashboard categories (Priorities view: waiting / followup / fyi). ✅

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
- Personal Intelligence Brief ("Briefing" page) — a separate, future track with its
  own phases A–F. See `docs/product/personal-intelligence-brief-plan.md`. Build only
  after the core Outlook + AI dashboard pilot is stable; news/intelligence must never
  appear above Today's Radar.

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
