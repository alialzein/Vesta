# Admin Panel (Operator Console) — Guide

> 👤 Operator guide. The admin panel is **for you (the operator)**, not for the
> managers who use Vesta. It lives at **`/admin`** and is invisible to everyone else.

## What it's for

One control room to support users, watch system health, control stored email, and
keep AI cost in check. It reads across **all** users (the manager app only ever shows
one person their own data).

## Getting in

- You sign in through the **normal Vesta login** (same page, same splash).
- The console only opens if your account is marked **admin**. Everyone else who tries
  `/admin` gets a plain **404** — they can't even tell it exists.
- To make someone an admin: open **Users & Accounts → "Make admin"** (or, the very
  first time, run `node scripts/grant-admin.mjs <email>` once — see below).

## The tabs (Wave 1)

The left rail has the live tabs plus three greyed-out **"Soon"** tabs (Wave 2).

### 🩺 Overview
The system pulse at a glance:
- **Users**, active **mailboxes**, and last sync time.
- **AI spend** today and this month.
- **Sync & queue health** — stale mailboxes, sync errors, webhook backlog/errors.
- **Recent errors** — the latest sync / webhook / AI failures, newest first.

If everything is green, the pipeline is healthy. Stale mailboxes or a growing webhook
queue point at the cron or the webhook URL.

### 👥 Users & Accounts
Every account, with per-user actions:
- **Reset password** — emails the user a Supabase reset link.
- **Make / Revoke admin** — grants or removes operator-console access.
- **Suspend / Re-enable** — blocks or restores a user.
- **Delete** — permanently removes the user **and all their data** (mail, work items,
  drafts). You must **type their email to confirm**. This cannot be undone.

You can't suspend or delete **your own** account (a safety guard).

### 📬 Mailboxes & Sync
Every connected mailbox: status, last sync, and any error. Per row:
- **Force sync** — pull new mail now.
- **Re-process** — re-run triage over already-stored mail (no fetch).

A red "error" column usually means tokens expired — the user reconnects Outlook.

### 🗄️ Email & Retention
Stored mail grows forever unless you purge it. This tab owns the policy:
- **Initial scan-back (days)** — how far back to import when a mailbox first connects
  (default **7**). Keeps day-one storage sane.
- **Retention (months)** — purge mail older than this. **Blank = keep forever.**
- **Soft-delete grace (days)** — how long to keep mail the user deleted in Outlook
  before permanently removing it (default **30**).
- **Purge soft-deleted now** / **Apply retention now** — run the cleanup immediately
  for everyone.
- **Storage by user** — message counts (total / hidden / soft-deleted) and the oldest
  message, so you can spot a runaway mailbox. **Wipe mail** clears one user's synced
  mail (their Outlook connection stays, so the next sync re-imports the recent window).

### 🧠 AI Control Center
Spend and control for everything AI:
- **Live runtime** banner shows the provider/model actually in use and whether the API
  **key is configured** (keys live in env/Vercel — never stored or shown here).
- **Model & budgets** — override the provider/model (overall, or per-task for analysis
  vs drafts), set per-run / per-day analysis caps, token prices (for cost estimates),
  a daily cost cap, the reply-intent mode, and the draft send mode. Blank = use env.
- **Re-analyze all** — after a prompt or model change, queue every open item to be
  re-analyzed on the next sync (this costs tokens).
- **Spend by feature / by user** and a **recent calls** ledger — fills as analysis,
  drafts, and reply-intent run.

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
The deterministic rules and AI memories that shape each user's triage:
- **Manager rules** — allow / mute / VIP rules per user; **enable/disable or delete** any.
- **Manager memories** — soft context the AI uses (tone, role, preferences);
  **activate/deactivate or delete**.
- **Feedback & corrections** — what users corrected (teaches Vesta), newest first.

### ✉️ Drafts & Sending
Oversight of AI reply drafts (nothing is ever auto-sent — users approve every send):
- KPIs: **sent / pending / errored** + the current **send mode**.
- Recent drafts with status, model, and any send error; **delete** a stuck/errored draft
  (never sends). Send mode is changed from the AI Control Center / Users tabs.

### 🔐 Audit & Security
- **Secrets & configuration** — which sensitive keys are set (presence only, never
  values), so you can spot a missing/rotatable secret.
- **Admins** — every account with operator-console access.
- **Audit log** — every mutating operator action, filterable by action type.

## Still deferred

**Impersonation** ("view as user") — the most privacy-sensitive feature — remains
deferred behind extra gates. See [../plans/admin-panel-plan.md](../plans/admin-panel-plan.md).
