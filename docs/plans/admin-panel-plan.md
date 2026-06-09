# Admin Panel — Plan (Operator Console)

> **Status: Wave 1 BUILT ✅ (tabs 1–5) — Wave 2 pending.** The operator console ships
> at `/admin` (role-gated; non-admins 404). Migration
> `supabase/migrations/20260609170001_admin_panel.sql` adds the settings/usage/purge
> tables + `is_admin()`. Guide: `docs/guides/admin-panel.md`. Wave 2 (tabs 6–8 +
> impersonation) is still planned — see §7.

The admin panel is for **us (the operators)**, not for managers using Vesta. It is a
separate, **role-gated** surface at `/admin`, reachable only when
`profiles.role = 'admin'`. It must never be reachable by a normal user.

## Locked design decisions (2026-06-09)

| Decision | Choice |
|---|---|
| **Access** | **Same login + role flag.** Admins sign in through the existing login page + splash; if `profiles.role = 'admin'`, the `/admin` area unlocks. One auth system. |
| **Non-admin access** | **404, not redirect** — the route's existence is not disclosed to non-admins. |
| **API keys / secrets** | **Stay in env / Vercel.** The panel selects provider/model and shows key *status* ("present / valid"), but never stores or displays the secret itself. |
| **First build** | **Wave 1 = tabs 1–5** (Health, Users, Mailboxes/Sync, Email Retention, AI Control Center). Tabs 6–8 are Wave 2. |
| **Impersonation** | **Deferred.** "View as user" is the most privacy-sensitive feature; added later behind extra gates. |

## Why we need it

As Vesta moves from a single pilot user toward multiple managers, we need one place
to support users, control their data, watch system health, and keep AI cost under
control. Everything we have already built (sync, triage, AI analysis, drafts, tasks,
rules, briefs) should be observable and controllable from here.

---

## 1. Navigation & screens

A persistent **left rail** with the sections below. Wave 1 sections are active; Wave 2
sections render as disabled "coming soon" entries so the full map is visible.

### 1. 🩺 Overview / Health  *(landing)* — Wave 1
System pulse at a glance:
- Total users · active mailboxes · syncs in the last hour (ok / failed).
- Webhook subscriptions **expiring soon** (Graph subscriptions expire ~every 3 days).
- **Queue depth** — backlog of `webhook_events` waiting to drain.
- **AI spend** today / this month (from the usage ledger, §5).
- Live **error feed** — recent sync / AI / auth errors with enough detail to act.

KPI cards across the top, recent-errors list below.

### 2. 👥 Users & Accounts — Wave 1
- Table of all users: role, signup date, onboarding status, mailbox connected y/n,
  last active, last successful sync, storage used.
- Per-user **detail drawer** with actions:
  - **Reset password** / trigger a reset email.
  - **Suspend / re-enable** an account.
  - **Delete a user + all their data** (GDPR-style hard delete, typed confirm).
  - **Re-trigger onboarding.**
  - **Export a user's data** (portability / support).
- *Deferred:* **impersonate / "view as user"** — read-only, audit-logged, extra gate.

### 3. 📬 Mailboxes & Sync — Wave 1
- All connected mailboxes: integration status, last sync, last error, delta-cursor
  health (`sync_cursors`).
- Actions: **force sync now**, disconnect, reconnect.
- **Webhook subscriptions** panel: which are active / expiring soon / dead, with a
  **renew** action.
- **Cron health**: are the scheduled sync + subscription-renewal jobs running?

### 4. 🗄️ Email Data & Retention — Wave 1  *(the original trigger for this doc)*
Today Vesta keeps a copy of all synced mail and only **soft-deletes** removed
messages; there is **no automatic clean-up**, so storage grows forever. The panel
owns the policy controls (each is global **or** per-user):
- **Initial sync window (scan-back limit)** — when a mailbox first connects, import
  only mail received within a bounded window (**default: last 7 days**) instead of the
  whole inbox. *Implementation: the sync filters inbound messages older than the cutoff
  before storing; the delta cursor still advances so ongoing new mail flows normally.*
- **Retention window** — keep mail for 6 / 12 / 24 months; older mail is purged.
- **Hard-delete of soft-deleted mail** — permanently clear rows marked `deleted_at`
  after a grace period (e.g. 30 days), so "deleted in Outlook" really frees storage.
- **Manual purge / "wipe synced mail"** per user (productionizes
  `scripts/clear-synced-mail.mjs`, keeping tokens so a clean re-sync is possible).
- **Storage usage per user** — message counts, oldest record, **hidden vs visible
  split** — so we can spot a runaway mailbox.

### 5. 🧠 AI Control Center — Wave 1
The cost- and quality-critical tab.
- **Provider / model per task** — cheap model for classification, stronger model for
  drafting; change **without a code deploy**. Provider abstraction already reads
  config (`lib/ai/config.ts`); the panel writes the DB-backed setting. *(Keys remain
  in env/Vercel; the panel only shows key status — see locked decisions.)*
- **Usage ledger** — tokens in/out, request count, model, cost; rolled daily / monthly,
  **per user and per feature** (triage assist, analysis, drafts, briefs).
- **Budgets & caps** — per-user and global token/cost ceilings. On breach, fall back to
  non-AI heuristics rather than overspending. (Turns today's `AI_MAX_PER_RUN` /
  `AI_MAX_PER_DAY` env caps into per-user UI + budgets.)
- **Re-analysis controls** — AI analysis is deduped (analyzed once per change), so a
  prompt/model change doesn't retro-apply. Let an operator **force a re-analysis** over
  selected items / a user / all, and see each item's `last_analyzed_at`, model, and
  `prompt_version`. *(Productionizes `scripts/reanalyze-work-items.mjs`.)*
- **Reply-intent mode per user** — `pregate_ai` (default) / `ai_always` / `heuristic` /
  `off`. Env-driven today (`AI_REPLY_INTENT_MODE`); per-user from here.
- **Prompt versioning** — `prompt_version` is already stored on `ai_analyses`; surface
  it so prompt changes can be compared / rolled back.
- **Rate limits** to protect against runaway loops.

### 6. 🎛️ Triage & Rules — Wave 2
- The **two-gate filter** config + the cost-aware **AI safety-net** knobs
  (`docs/plans/triage-ai-safety-net.md`).
- Per-user `manager_rules` and `manager_memories` (view / toggle / delete).
- `feedback_events` stream — what users corrected (teaches Vesta).

### 7. ✉️ Drafts & Sending — Wave 2
- `draft_replies` oversight: pending / approved / sent / error.
- **Send mode** (`graph` vs `draft_only`) global / per-user (`DRAFT_SEND_MODE` today).
- Failed-send feed.

### 8. 🔐 Audit & Security — Wave 2
- `audit_logs` viewer — filter by user / action / entity.
- Sensitive-action trail: impersonation, data wipes, role changes, token access.
- **Key-rotation status / reminders** (we have standing rotation TODOs).
- **Admin management** — who is an admin (`profiles.role`).
- Visibility into RLS-protected access; confirm no cross-user leakage.

---

## 2. UI / UX design

The operator console looks deliberately **different** from the manager app — a denser
"mission control" feel — while staying on the **same theme system** so light/dark both
work everywhere (per `CLAUDE.md`, non-negotiable).

- **Shell:** persistent left rail (the 8 sections; Wave 2 disabled with a "soon" tag).
  Top bar shows a **"Vesta · Operator Console"** wordmark, an **environment badge**
  (prod / dev), the signed-in admin, a **theme toggle**, and a **"← Back to app"** link.
- **Brand continuity:** reuses the existing **`VestaSplashScreen`** on first load and
  the same `--atmos-*` / `bg-panel` / `text-ink` / `border-line` tokens. No hardcoded
  colors; verified in **both** themes before "done".
- **Density:** data-dense tables with column filters and search; a **detail drawer**
  per row (same drawer pattern as the manager dashboard) rather than full page nav.
- **KPI cards** on Overview; small sparkline/trend for AI spend and sync success.
- **Every mutating action** (purge, reset password, delete, wipe, force-renew) goes
  behind a **typed confirmation modal** ("type the user's email to confirm") and writes
  an `audit_logs` row. Destructive actions are visually distinct (danger styling).
- **Navigation performance** (per `CLAUDE.md`): every nav entry uses `next/link` with
  `prefetch`; every data-fetching route ships a theme-aware `loading.tsx` skeleton
  (reuse `components/ui/PageSkeleton.tsx`).
- **Empty / error states** are first-class (no blank screens), themed for both modes.

---

## 3. Access control & security

- Route group `app/(admin)/admin/...`, gated **twice**: middleware + a server check of
  `profiles.role = 'admin'` on every admin server action / route.
- Non-admins receive a **404** (not a redirect) so the surface isn't disclosed.
- All admin **writes** go through server actions that re-verify the admin role and
  **audit-log** the action (actor, target, before/after).
- Secrets (API keys, Graph tokens) are **never** sent to the admin browser — status
  only. Keys live in env/Vercel; Graph tokens stay in `private.graph_tokens`.

---

## 4. What this controls (coverage map)

Everything we've shipped should be observable/controllable here:

| Area | Built | Controlled from tab |
|---|---|---|
| Users, roles, onboarding | `profiles` | 2 Users |
| Outlook integration & tokens | `user_integrations`, `mailboxes`, `private.graph_tokens` | 3 Mailboxes |
| Delta sync & cursors | `sync_cursors`, cron | 3 Mailboxes |
| Webhooks / subscriptions | `webhook_events`, Graph subs | 1 Health, 3 Mailboxes |
| Stored mail & retention | `email_messages`, `email_threads` | 4 Email Data |
| Triage / hidden gates | engine + filter config | 6 Triage |
| Work items dashboard | `work_items` | 5 AI, 6 Triage |
| Follow-up / waiting detection | engine, reply-intent | 5 AI, 6 Triage |
| AI analysis, cost, tokens | `ai_analyses` | 5 AI |
| Draft replies & sending | `draft_replies` | 7 Drafts |
| Tasks & reminders | `tasks`, `reminders` | 2 Users (per-user) |
| Memory & rules | `manager_rules`, `manager_memories`, `feedback_events` | 6 Triage |
| Notifications | `notification_events` | 1 Health |
| Daily briefs | `daily_briefs` | 5 AI |
| Audit trail | `audit_logs`, `account_transfer_events` | 8 Audit |

---

## 5. Config knobs to surface (env → DB-backed settings)

These are env-driven today and become panel-editable (global default + per-user
override) via the new settings tables (§6):

- `AI_PROVIDER`, `AI_MODEL` (per task) · `AI_MAX_PER_RUN`, `AI_MAX_PER_DAY` (budgets)
- `AI_PRICE_INPUT`, `AI_PRICE_OUTPUT` (for cost estimates)
- `AI_REPLY_INTENT_MODE` (per user)
- `DRAFT_SEND_MODE` (per user / global)
- **New:** initial scan-back window, retention window, soft-delete grace.

`AI_API_KEY` and other secrets stay in env/Vercel (status shown, value never stored).

---

## 6. Database changes (migration — approval required before applying)

Per `CLAUDE.md`, exact SQL is proposed and **approved separately** before anything
runs. Anticipated new tables:

- **`app_settings`** — global config (key/typed value): default scan-back window,
  retention window, soft-delete grace, per-task AI provider/model, global budgets,
  feature flags, cron config.
- **`user_settings`** — per-user overrides: retention, reply-intent mode, send mode,
  budgets, scan-back.
- **`ai_usage`** — unified per-call ledger (user, feature, model, tokens in/out, cost,
  created_at). Broader than `ai_analyses` so drafts/briefs usage is captured too.
- *(maybe)* **`purge_jobs`** — retention/purge run tracking (last run, rows purged).

Plus a scheduled **purge job** (extend the existing cron) and a **role** convention
(`profiles.role = 'admin'`). Reuse `audit_logs` for admin actions (no new table).

> Migrations are immutable/append-only — a new migration per change, never edit an old
> one (`docs/README.md` → "Database migrations are immutable").

---

## 7. Phasing & build order

**Wave 1 — "minimal ops" (this build):**
1. Admin shell + route group + role gate + splash + both themes + nav skeletons.
2. **Overview / Health** (read-only first — fastest value).
3. **Mailboxes & Sync** (force sync, webhook/cron health).
4. **Email Data & Retention** (settings + manual purge; scheduled purge job).
5. **Users & Accounts** (reset / suspend / delete / export).
6. **AI Control Center** (usage ledger + cost view + budgets + re-analysis + model select).

Each ships its **`loading.tsx`**, tests for logic, and is verified in **both themes**.
Migrations (§6) are approved before the tabs that depend on them.

**Wave 2 — full panel:**
7. Triage & Rules · 8. Drafts & Sending · 9. Audit & Security · impersonation.

## 8. Deliverables (definition of done — per `CLAUDE.md`)

- Role-gated `/admin` shell, both themes, nav prefetch + `loading.tsx` skeletons.
- Wave 1 tabs functional, mutating actions audit-logged + behind typed confirms.
- Approved migrations applied; settings read by the relevant runtime paths.
- Tests for new logic (settings resolution, retention cutoff, usage rollups, role gate).
- **User guide** at `docs/guides/admin-panel.md` (operator-facing) + linked in
  `docs/guides/README.md`. *(Created with the implementation, per rule 5a.)*
- Docs updated: `phases.md` status, `reference/database` if schema changed.

## Related

- `docs/guides/email-sync.md` — old mail isn't auto-purged yet (this fixes it).
- `docs/plans/feature-roadmap.md` — Phase F (company-wide expansion).
- `docs/plans/phases.md` — Phase 14 (multi-user).
- `docs/plans/triage-ai-safety-net.md` — cost-aware AI use (feeds usage/budget design).
