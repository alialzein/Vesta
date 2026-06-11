# Implementation Phases

Build one phase at a time. Do not skip ahead.

## Phase 0 — Dashboard Shell and Project Foundation

Status: **Done.** Next.js + Tailwind app scaffolded; Arctic Frost mockup ported
into reusable components fed by `lib/demo-data.ts`; unit/component/E2E tests
added; runs locally. See `docs/reference/architecture/project-structure.md`.

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

See `docs/archive/design/visual-direction-v2.md`.

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
(plan: `docs/archive/design/phase-0-3-dashboard-focus-polish-plan.md`). Still demo-only:

- Compact Morning Brief: badge + headline + one summary line + a small
  "Top risk" chip + four quick actions (Clear My Day, Draft Replies, Delegate,
  Meeting Prep). The large urgency ring was removed to stop repeating the score.
- Large AI Command Center cards removed from the Today page (component kept,
  gated behind `SHOW_LARGE_COMMAND_CENTER = false` for a future page).
- Six KPI cards replaced by a compact `MetricsStrip` (4 primary + 2 secondary).
- Today's Radar promoted; reachable earlier on a laptop screen.
- "Ask Vesta" FAB becomes compact (icon-only) while the AI rail is expanded.

See `docs/archive/demo/demo-behavior.md` for what is real vs. placeholder.

### Phase 0.4 — Final UI/UX Fixes

Status: **Done.** A focused fix pass (no redesign), still demo-only. Plan/details:
`docs/archive/design/final-ui-fixes-phase-0-4.md`.

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
`docs/archive/design/phase-0-5-ai-brand-polish-plan.md`,
`docs/archive/design/loading-experience-v1.md`, `docs/archive/design/ai-motion-principles.md`.

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
`docs/archive/design/login-experience-v1.md`.

**Decision:** the login Microsoft button is **sign-in / SSO only**. Connecting the
Outlook **mailbox** for email is a separate **"Connect Outlook"** step in
Settings/onboarding (Microsoft Graph OAuth — not SMTP/IMAP), planned for Phase 3.
The login screen states this explicitly so the two are not confused.

**Expanded direction.** Login is multi-provider (email/password + Google +
Microsoft SSO via Supabase Auth), a first-run **onboarding tour** collects
personality/preferences into `manager_memories` (+ briefing preferences), and the
mailbox layer supports **both OAuth (Outlook, then Gmail; auto-refreshed) and
IMAP**, kept separate from login. Full plan:
`docs/plans/auth-onboarding-and-mailbox-plan.md`.

### Phase 2b — SSO login providers (in progress)

Status: **Code done; pending provider config.** "Continue with Microsoft" and
"Continue with Google" call `supabase.auth.signInWithOAuth` and redirect to
`/auth/callback`; they degrade gracefully until each provider is enabled in
Supabase. Setup steps: `docs/reference/architecture/auth-providers-setup.md`. SSO is
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
token pair. Setup guide: `docs/reference/architecture/outlook-connect-setup.md`.

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

Status: **Done.** Keeps Outlook data current without the manager clicking "Sync
now" — and without a browser open: server-side scheduled sync + real-time webhooks
+ true Graph delta tokens + a webhook queue.

- **Background auto-sync (live):** `components/sync/AutoSync.tsx` runs on the
  dashboard, Inbox, and Priorities — on mount (if the last sync is stale) and on a
  5-minute interval — calling `syncOutlook` and refreshing. Staleness is the pure,
  tested `lib/sync/auto.ts` (`shouldAutoSync`); `getSyncStatus` reports connection
  + `last_success_at`. Incremental "only new" works now that the cursor persists
  (Phase 6.5 fix).
- **Server-side scheduled sync (live):** `lib/sync/outlook.ts` gained a
  service-role path — `runMailboxSync` (works with either the authed or service
  client), `syncAllConnectedMailboxes`, `syncMailboxById` — so a sync runs with no
  user session. Exposed as secured `GET/POST /api/cron/sync` (also drains the
  `webhook_events` queue) and `/api/cron/renew-subscriptions`, gated by
  `CRON_SECRET` (`lib/cron/auth.ts`). The scheduler is **Supabase pg_cron + pg_net**
  hitting those host-agnostic endpoints (free, any frequency, portable; no Vercel
  Pro needed). The browser `AutoSync` interval is now only a local-dev fallback.
- **Webhooks (live on deploy):** the OAuth callback creates a Graph subscription
  (`lib/sync/subscriptions.ts`; id/clientState/expiry stored in
  `mailboxes.metadata`, no migration). `app/api/outlook/webhook/route.ts` validates
  `clientState` (anti-forgery), attributes each notification to its mailbox, and
  queues it in `webhook_events`; the sync cron drains it. Needs
  `MS_GRAPH_WEBHOOK_URL` set + the subscription renewed before its ~3-day expiry.
- **Delta tokens (live):** the inbox sync uses a Graph delta query
  (`lib/graph/mail.ts` `fetchInboxDelta`), persisting `deltaLink` / `next_link` in
  `sync_cursors` — so it pulls only what changed (added/updated + **removed**) and
  resumes a large first sync across runs. Removed mail is soft-deleted
  (`deleted_at`) and dropped from threads, work_items, and the Inbox/Hidden views.
  This precise change-detection is what server push (e.g. phone notifications with
  no browser open) needs. Sent stays timestamp-incremental.

Deliverables:

- Graph webhook endpoint. ✅ (validates clientState + queues attributed events)
- Subscription create/renew/delete + lifecycle. ✅ (created on connect, renewed by cron)
- Background/scheduled auto-sync. ✅ (server-side, service-role, all mailboxes — no browser)
- Queue processing. ✅ (`webhook_events` drained by the sync cron)
- True Graph delta tokens (`deltaLink`). ✅ (inbox delta — new/updated + removed;
  resumable; deletes soft-removed and dropped from views)

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

## Phase 6.5 — Email Triage (manager-controlled inclusion)

Status: **Done (core).** Mailboxes are noisy (alerts, newsletters, automated
notifications). Triage decides which mail Vesta imports as actionable so the
Inbox/Priorities stay focused, with the manager in control. Migration
`20260607090001_email_triage.sql`.

- `lib/engine/triage.ts` — pure, unit-tested `classifyEmail(message, config)`
  returning `{ include, reason, signals }`. Layered, first-match-wins: allow/VIP →
  mute → mode. Modes: **focused** (default — Outlook Focused Inbox minus
  automated/bulk/`Other`), **flagged** (only flagged mail), **everything**.
- Sync (`lib/sync/outlook.ts`) now: pulls **only mail newer than the last sync**
  (`sync_cursors.last_success_at` + Graph `receivedDateTime` filter); classifies
  each inbound message; stores **all** mail but marks noise `excluded_at` +
  `excluded_reason` (kept for review); builds threads + `work_items` from
  **visible** mail only. Outbound is always kept.
- Control: **Settings → "What Vesta watches"** mode selector (re-runs triage over
  stored mail instantly); **Hidden** review (`/hidden`) with one-click _Always
  allow_ / _Mark VIP_; **Inbox** per-sender _Mute_ / _Mark VIP_; **Managed
  senders** in Settings to view/remove rules. Mute/allow rules reuse
  `manager_rules`; VIP reuses `people.is_vip`.
- Classification runs over **stored** mail (not just the fetched batch), so a mode
  or rule change re-evaluates everything immediately. `sync_cursors` is written via
  the **service role** (it's service-write under RLS) — fixing incremental sync,
  which previously failed silently and re-pulled the whole window each time.
- `scripts/clear-synced-mail.mjs` wipes synced data (keeps tokens) for a clean
  re-sync after triage changes.

Deliverables:

- Pure triage classifier + unit tests (modes, mute/allow/VIP, automated/bulk). ✅
- Incremental "only new" sync (cursor via service role). ✅
- Hidden mail stored + excluded from Inbox/Priorities; manager mode control. ✅
- Hidden-review UI (Always allow / Mark VIP) + Inbox mute/VIP + rule management. ✅

## Phase 7 — AI Analysis

Status: **Done (core analysis).** AI now reads each "waiting on you" thread and
fills the work item's summary, category, refined priority, deadline, suggested next
action, and user-visible reason — so the dashboard's Next Best Action / Why this
matters / summary / ranking are real AI output, not heuristics. No migration
(reused `ai_analyses` + existing `work_items` AI fields).

- **Provider abstraction** (`lib/ai/`): provider + model + key read from env
  (`AI_PROVIDER` / `AI_MODEL` / `AI_API_KEY`), so it's swappable without a deploy
  (admin panel later). First adapter: **OpenAI** (`gpt-5.4-mini`); an Anthropic
  adapter slots in unchanged.
- **Prompt + output contract** (`lib/ai/context.ts`, `lib/ai/schema.ts`): sends the
  latest message (HTML→text, quote-stripped, capped) + the Phase 6 thread state, so
  long threads stay cheap; a defensive parser validates the JSON so a bad response
  never breaks the dashboard. User-visible reasoning only — no chain-of-thought.
- **Runs after sync** (`lib/ai/store.ts`, called from `lib/sync/outlook.ts`),
  best-effort: only open Outlook items, **analyzed once per change**
  (`last_analyzed_at` vs latest message), highest priority first.
- **Cost/token tracking + budget caps:** each call's model, tokens, and cost are
  written to `ai_analyses`; `AI_MAX_PER_RUN` (20) and `AI_MAX_PER_DAY` (200) bound
  spend. Cost is computed from a price table or `AI_PRICE_INPUT`/`AI_PRICE_OUTPUT`
  (set these for OpenAI rates). ~283 tokens/email in testing → cents/month.

Deferred:

- **Suggested draft replies** → Phase 9 (with the approval + send flow).
- **AI triage safety-net** — cost-aware second opinion on the ambiguous "gray zone"
  so real human mail isn't wrongly hidden. Design: `docs/plans/triage-ai-safety-net.md`.
- **`ai_usage` admin rollups / budgets UI** → admin panel (`docs/plans/admin-panel-plan.md`).

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

Status: **Done.** The manager can have Vesta **generate** a reply, **edit** it,
**approve** it, and **send** it as a properly threaded Outlook reply — draft-first,
never auto-sent. No migration (reused the Phase 1 `draft_replies` + `audit_logs`
tables).

- **Generation** (`lib/ai/draft.ts`): a draft prompt + defensive parser following
  the prompt contract (`subject` / `body_text` / `tone` / `warnings` /
  `requires_human_review`). Sends only the latest inbound message + the manager's
  tone/preference memories (data minimization); never invents facts; flags sensitive
  topics. Cost tracked in `ai_analyses`.
- **Composer** (`components/dashboard/DraftComposer.tsx`): a theme-aware slide-over
  with **editable To/Cc/Bcc** (real addresses as chips — remove any, add more incl.
  Bcc), a reply-all toggle that re-seeds To/Cc, subject, tone selector, a per-reply
  instruction, a roomy editor, AI + deterministic sensitive-topic cautions, the
  required safety copy, and **Regenerate / Save / Approve & Send**. Auto-generates on
  open when AI is on; opens a blank editor (backed by a real draft row) when it's off,
  so manual replies work too. Opened from the AI rail's Action/Draft tabs.
- **Send** (`lib/graph/send.ts`): the Graph **`reply` action** (needs only
  **`Mail.Send`**) with the composed HTML body (the manager's reply + the quoted
  original, built from our stored copy of the message) and the **exact edited
  To/Cc/Bcc**. One call, threaded, saved to Sent Items. We deliberately avoid
  `createReply` for sending — it creates a *draft* and would need the broader
  `Mail.ReadWrite` scope (it's used only by the optional draft-only mode). Pure
  recipient/quote/body helpers in `lib/email/reply.ts` (unit-tested); the send flow is
  mocked-tested.
- **Approval + audit** (`app/actions/drafts.ts`): every send runs only on explicit
  approval, writes an immutable `audit_logs` row (`email_sent`, service-write), and
  marks the work item **done** (it resurfaces if the person replies). One active draft
  per item; drafts persist (a "Draft ready" state on the radar).
- **Scopes:** added `Mail.Send` (`lib/graph/oauth.ts`) — sending uses the `reply`
  action, which needs only that. `hasSendScope` detects mailboxes connected before
  Phase 9 and the UI shows **"Reconnect to enable sending"** (Settings + composer).
  `DRAFT_SEND_MODE=draft_only` builds an Outlook draft instead of sending — that path
  uses `createReply` and so additionally needs the `Mail.ReadWrite` scope.
- Guide: `docs/guides/draft-replies.md`.

Deliverables:

- Draft editor. ✅ (composer drawer; edit body/subject/recipients/tone)
- Draft generation prompt. ✅ (`lib/ai/draft.ts` + parser + tests)
- Approval flow. ✅ (explicit Approve & Send; no auto-send; sensitive-topic review)
- Send through Graph. ✅ (threaded reply/reply-all with quoted history)
- Audit logs. ✅ (`audit_logs` `email_sent`, service-write)

## Phase 10 — Memory and Rules

Status: **Done.** The manager teaches Vesta in **Memory & Rules** (sidebar →
Intelligence) and every active memory is retrieved into the AI paths. No
migration (reused `manager_memories` + `people`; approval state rides on
`is_active` + `metadata.status`).

- **Retrieval** (`lib/ai/memory.ts`, pure + unit-tested): deterministic
  type/scope selection (person-scoped memories fire only on that sender),
  capped lines. Analysis prompt (v3) gains the manager's standing notes
  (VIP/delegation/do-not-do/context) + a sender-is-VIP signal; the draft
  prompt (draft-v3) gains hard "never do" rules (system, absolute) + saved
  context, beyond the existing tone notes.
- **VIP senders:** a VIP memory naming an email also flips `people.is_vip`
  (stamped `vip_reason='memory:<id>'`, so removing the memory un-VIPs exactly
  that flag). Fixed: the sync orchestrator now passes `isVip` into
  `scoreThread` (the +20 boost existed but was never wired).
- **UI:** `MemoryView` is real (server actions `app/actions/memories.ts`:
  add / pause / resume / forget / approve / reject; both themes); the rail's
  Memory tab shows the memories actually applied to the selected item and
  quick-adds a sender-scoped memory.
- **Approval flow:** non-manual memories land `is_active=false` +
  `metadata.status='pending'` and appear under "Vesta suggests — waiting for
  your approval"; nothing applies until approved. First producer: sending a
  draft steered by a custom instruction files a deterministic, deduped
  suggestion scoped to that recipient.
- Guide: `docs/guides/memory-and-rules.md` (+ ai-analysis / draft-replies
  updates).

Deliverables:

- Memory/rules UI. ✅ (real CRUD + approval queue, both themes)
- VIP senders. ✅ (memory → people.is_vip → triage + scoring + AI signal)
- Delegation rules. ✅ (retrieved into analysis; AI names the delegate)
- Tone preferences. ✅ (all drafts; preferences also shape ranking)
- Memory approval flow. ✅ (pending suggestions; approve/reject)
- Memory retrieval in AI analysis/drafting. ✅ (prompt v3 / draft-v3)

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
  own phases A–F. See `docs/plans/personal-intelligence-brief-plan.md`. Build only
  after the core Outlook + AI dashboard pilot is stable; news/intelligence must never
  appear above Today's Radar.

## Phase 13 — Teams Later

Goal:

- Teams notifications first, Teams message ingestion later.

Deliverables:

- Teams brief/reminder notifications.
- Bot mentions.
- Selected chats/channels if approved.

## Admin Panel — Wave 1 + Wave 2 ✅ (Operator Console)

Status: **built** (operator console at `/admin`). Role-gated on the Supabase
**`app_metadata.is_admin`** claim (non-admins 404). **Wave 1:** Overview/Health, Users &
Accounts (reset password, make/revoke admin, suspend, hard-delete), Mailboxes & Sync
(force sync, re-process), Email & Retention (scan-back/retention/grace policy, purge,
per-user wipe + storage), AI Control Center (usage ledger, spend by feature/user,
model/budget overrides, re-analyze). **Wave 2:** Triage & Rules (rules/memories toggle &
delete, feedback stream), Drafts & Sending (oversight + KPIs + send mode), Audit &
Security (audit-log viewer + filter, secrets status, admins list). New tables:
`app_settings`, `user_settings`, `ai_usage`, `purge_jobs`. Only **impersonation** is
still deferred. Guide: `docs/guides/admin-panel.md`. Plan: `docs/plans/admin-panel-plan.md`.

## Phase 14 — Multi-user/Company Expansion Later

Goal:

- Support multiple managers.

Deliverables:

- Organization tables.
- Admin consent flow.
- Privacy-safe department analytics.
- Tenant isolation.
