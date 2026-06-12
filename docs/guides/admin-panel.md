# Admin Panel (Operator Console) — Guide

> 👤 Operator guide. The admin panel is **for you (the operator)**, not for the
> managers who use Vesta. It lives at **`/admin`** and is invisible to everyone else.

## What it's for

One control room to support users, watch system health, control stored email, and
keep AI cost in check. It reads across **all** users (the manager app only ever shows
one person their own data).

## Getting in

- You sign in through the **normal Vesta login** (same page, same splash) and land
  straight in the console. An admin account is an **operator account** — it has no
  manager dashboard; every app page redirects you back to `/admin`.
- The console only opens if your account is marked **admin**. Everyone else who tries
  `/admin` gets a plain **404** — they can't even tell it exists.
- To make someone an admin: open **Users & Accounts → "Make admin"** (or, the very
  first time, run `node scripts/grant-admin.mjs <email>` once — see below).

## Working the tables

Every list in the console works the same way: a **search box**, **filter dropdowns**,
**clickable column headers** to sort, and **pagination** when a list gets long. Hover
any ⓘ dot or KPI card for a plain-language explanation of the term.

## The tabs

> **The console is LIVE.** Every tab re-fetches its numbers every 30 seconds —
> the green **● Live** pill in the top bar shows the last refresh time; click
> it to pause/resume. The layout uses the full screen width.

### 🩺 Overview
The system pulse at a glance:
- **Needs attention** — the first thing on the page: a strip listing exactly
  what's wrong right now (erroring/stale syncs, webhook errors, overdue or
  failed reminders, suspended accounts), each line linking to the tab that
  fixes it. When nothing is wrong it says **All clear**.
- **Users**, active **mailboxes**, and last sync time.
- **AI spend & usage** for a selectable date range — **Today / 7 days / This month
  (default) / 30 days** pills at the top right; every card is labeled with the range.
- **Sync & queue health** — stale mailboxes, sync errors, webhook backlog/errors
  (live numbers, not range-filtered).
- **Assistant queues** — what Vesta owes people right now: reminder emails
  scheduled / overdue (a cron-health signal) / failed, and drafts awaiting
  manager approval.
- **Recent errors** — the latest sync / webhook / AI failures (including
  failed chat/draft/brief calls), newest first.

If everything is green, the pipeline is healthy. Stale mailboxes or a growing webhook
queue point at the cron or the webhook URL.

### 👥 Users & Accounts
Every account with an avatar, status badges, mailbox sync state, mail volume, and
**when + where they last signed in** (city/country on the deployed app; sign-ins are
recorded from Wave 5 onward). **Click a user** to open their full detail page.

Per-user actions (row or detail page):
- **Reset password** — emails the user a one-time reset link; it lands on a
  "Choose a new password" page. Links expire and work once — some email providers'
  link scanners (notably Outlook/Hotmail) can consume them early; if that happens,
  use Set password instead.
- **Set password** — type or generate a password and apply it instantly (for users
  who can't receive email). It's never stored or logged; share it securely.
- **Make / Revoke admin** — grants or removes operator-console access.
- **Suspend / Re-enable** — *really* blocks the account: new sign-ins are refused
  and any session they already have ends on its next request, with a clear
  "account suspended" notice at login.
- **Delete** — permanently removes the user **and all their data** (mail, work items,
  drafts). You must **type their email to confirm**. This cannot be undone.

You can't suspend, delete, or de-admin **your own** account (safety guards).

**The user detail page** (click any user) adds:
- Identity, email-confirmation and onboarding status, and **last sign-in location**.
- A **timezone editor** (drives how times display for that user).
- Mailbox & sync health, per-user setting overrides, recent drafts, month AI spend.
- **Activity history** — logins (with method/IP/location), sent replies, and every
  admin action taken on the account.
- **Export data** — download everything the user owns as a JSON file (portability /
  support requests). Audit-logged.
- **Re-trigger onboarding** — sends them through the first-run wizard on their next
  visit (their data is untouched).

### 📬 Mailboxes & Sync
Every connected mailbox: health (healthy / stale / error), last sync, the **webhook
subscription state** (active / expiring / expired / none, with its expiry countdown),
and any error. Per row:
- **Force sync** — pull new mail now.
- **Re-process** — re-run triage over already-stored mail (no fetch).
- **Renew webhook** — refresh the Graph subscription (they expire every ~3 days; the
  cron renews them, this is the manual override).

A red "error" usually means tokens expired — the user reconnects Outlook.

### 🗄️ Email & Retention
Stored mail grows forever unless you purge it. This tab owns the policy:
- **Initial scan-back (days)** — how far back to import when a mailbox first connects
  (default **7**). Enforced during the first sync — older mail is never stored.
- **Retention (months)** — purge mail older than this. **Blank = keep forever.**
- **Soft-delete grace (days)** — how long to keep mail the user deleted in Outlook
  before permanently removing it (default **30**).
- **Purge soft-deleted now** / **Apply retention now** — run the cleanup immediately.
  For hands-off cleanup, schedule **`/api/cron/purge`** daily (same `CRON_SECRET`
  pattern as the sync cron) — it applies both policies automatically and records
  every run.
- **Storage by user** — message counts (total / hidden / soft-deleted) and the oldest
  message, so you can spot a runaway mailbox. **Wipe mail** clears one user's synced
  mail (their Outlook connection stays, so the next sync re-imports the recent window).

### 🧠 AI Control Center
Spend and control for everything AI. **These settings are live levers** — the AI
pipeline reads them on every run (no deploy needed); blank = use env.
- **Live runtime** banner shows the provider/model actually in use and whether the API
  **key is configured** (keys live in env/Vercel — never stored or shown here).
- **Model & budgets** — provider/model overrides (overall, or per-task for analysis vs
  drafts), per-run / per-day analysis caps, **token prices** (set these or all costs
  show $0.00 — an amber banner reminds you), a **global daily cost cap**, the
  reply-intent mode, and the draft send mode. Hover any field's ⓘ for what to enter.
- **Per-user controls** (Users tab / detail page): pause AI for one user, per-user
  daily cost cap, per-user reply-intent and send modes. When a user is paused or over
  a cap, analysis quietly skips, ✨ quick-capture falls back to the no-AI parser, and
  the draft composer tells them why.
- **Re-analyze all** — after a prompt or model change, queue every open item to be
  re-analyzed on the next sync (this costs tokens).
- **Daily activity** — a 14-day token bar chart (hover a bar for calls, tokens,
  cost; a red dot marks days with failed calls).
- **What's consuming** — the answer to "where do tokens go": usage broken down
  by call **kind**, not just feature (the `brief` feature alone hides a ~300-token
  rank call and a ~17,000-token briefing search). Shows calls, tokens in/out,
  **average and max per call** (max ≥10k glows amber — your optimization target),
  cost, and errors.
- **Heaviest calls** — the biggest single calls this month, with who triggered them.
- **Spend by feature / by user** and a **recent calls** ledger (now with the call
  kind and the user). Rows recorded before prices were set still show dollars —
  costs are estimated from their tokens × the current prices.
  (`node scripts/backfill-ai-usage.mjs` imports pre-ledger history;
  `node scripts/ai-usage-report.mjs` prints the same analysis in the terminal.)

### 👤 Admin Settings (the super admin itself)
The operator account is **not a user**: it has no mailbox, no radar, no
memories, and it never appears in Users & Accounts. The middleware keeps it
inside /admin (any app page bounces back to the console), and its sessions
**expire after 12 hours** by design. This tab manages the account itself:

- **Operator account** — which email is admin, last sign-in, and how to move
  admin rights later (`node scripts/grant-admin.mjs new@email` + clearing
  `is_admin` on the old one in Supabase).
- **Password** — change it right here.
- **Two-factor (optional, recommended)** — authenticator-app TOTP: tap
  *Turn on two-factor*, scan the QR with Google Authenticator/Authy, enter
  the 6-digit code. Requires TOTP enabled once in **Supabase →
  Authentication → Multi-Factor**.
- **Maintenance mode** — one switch that locks the app for normal users
  (they see a friendly "back soon" screen; mail keeps syncing) while the
  console stays open. Flips are audit-logged.
- **Your recent admin actions** — the account's own audit trail at a glance.

### 🤖 Ops automation (runs by itself)
A scheduled job (`/api/cron/ops`, every ~15 minutes) acts as your standing
orders — and emails you (via Resend) only when something needs you:

- **Cost-cap alarm** — when a user's AI spend today reaches their cap
  (per-user cap, else the global one — **no cap set = nothing ever fires**),
  you get an email; the pause itself already happens automatically.
- **Self-healing pipeline** — stale mailboxes get an extra sync attempt;
  webhook subscriptions near expiry are renewed. You're emailed **only when
  self-healing fails**.
- **Morning digest** — the Needs-attention list, mailed once a day
  (05:00 UTC ≈ 8am Beirut by default, `DIGEST_HOUR_UTC` to change) and only
  on days when something is actually wrong. Healthy days = no email.

Every automated action and email lands in the **audit log**
(`system_alert` / `system_digest`) and is deduped per day, so one problem
never floods your inbox. Alert recipient = the admin account email
(`ALERT_EMAIL` env overrides). Requires `RESEND_API_KEY`; until you verify
a domain at Resend, mail delivers only to the address that owns the Resend
account.

## Safety model

- Every **destructive** action (delete, wipe, purge, suspend) asks for confirmation —
  delete/wipe make you **type the email** first.
- Every mutating action is written to the **audit log** (who / when / what).
- Secrets never reach the browser; cross-user reads happen server-side behind the
  admin check, then a 404 for anyone who isn't an admin.
- Both **light and dark** themes are supported, like the rest of Vesta.

## First-time setup

1. Apply the migration `supabase/migrations/20260609170001_admin_panel.sql` (adds the
   settings, usage-ledger, and purge-audit tables + the `is_admin()` function).
2. Grant yourself admin: `node scripts/grant-admin.mjs <your-login-email>`.
3. Visit `/admin`.

### 🎛️ Triage & Rules
The deterministic rules and AI memories that shape each user's triage. Opens with the
**10 most recently added** rules/memories across all users; use the **searchable user
picker** (type an email or name, pick from the list) to manage one user's full set:
- **Manager rules** — allow / mute / VIP rules; **enable/disable or delete** any.
- **Manager memories** — soft context the AI uses (tone, role, preferences);
  **activate/deactivate or delete**.
- **Feedback & corrections** — what users corrected (teaches Vesta), newest first.

### ✉️ Drafts & Sending
Oversight of AI reply drafts (nothing is ever auto-sent — users approve every send):
- KPIs: **sent / pending / errored** + the current **send mode**.
- The draft list (last 500) with search, status/model filters, and any send error;
  **delete** a stuck/errored draft (never sends). Send mode is changed from the AI
  Control Center (global) or per user.

### 🔐 Audit & Security
- **Secrets & configuration** — which sensitive keys are set (presence only, never
  values), so you can spot a missing/rotatable secret.
- **Admins** — every account with operator-console access.
- **Audit log** — the full trail (last 500): **logins** (with method and location),
  **sent replies and failed sends**, and every mutating operator action — searchable,
  with action/actor filters and color-coded severity.

## Still deferred

**Impersonation** ("view as user") — the most privacy-sensitive feature — remains
deferred behind extra gates. See [../plans/admin-panel-plan.md](../plans/admin-panel-plan.md).
