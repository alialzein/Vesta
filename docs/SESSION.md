# Session Handoff — Vesta

> **Read this first** when starting a new session (then `git pull`). This is the
> living status + next-steps file that travels across laptops/sessions via git.
> Claude updates it at the end of each session and pushes it.

**Last updated:** 2026-06-10 (Admin **Wave 5 merged** ✅ — admin panel complete; Supabase URLs configured)
**Repo state:** `main`, clean. Phases 0–9 done; **Admin Waves 1–5 all merged**
(latest `26bd54c`). 283 tests green, typecheck + lint + build clean.
**Supabase URL config done** (Site URL = production; Redirect URLs incl. `/**`
wildcards for prod + localhost) — reset-password links should now work end to end.
**The admin-panel plan is fully built** except impersonation (deliberately deferred)
and an MFA enrollment flow (optional, on request).
**Next: Phase 10 — Memory & Rules** (the next core product phase).

### ✅ Verify when convenient (Wave 4+5, on Vercel)
- Reset password (admin or dev user) → email link → update-password page → new
  password works. Sign in → Users tab shows last sign-in **location** (city on Vercel).
- Overview: range pills (default this month); AI page costs now show dollars.
- Set a tiny daily cost cap ($0.01) → draft generation reports the cap; remove it.
- Schedule `/api/cron/purge` daily in pg_cron alongside `/api/cron/sync`.

## Admin Wave 5 (merged `26bd54c`)

- **Overview date filter** — Today / 7 days / **This month (default)** / 30 days pills
  drive the AI spend + usage cards (`getHealthOverview(sinceIso)`); cards are labeled
  with the range so "today vs month" numbers can't be confused again.
- **Triage user picker** — searchable combobox (type email/name → pick) replaces the
  plain dropdown; default view stays "10 newest rules/memories across users".
- **Login location** — sign-ins now record IP + city/country (Vercel geo headers) +
  user agent into the login audit row; Users table shows *when + where* the latest
  sign-in happened; user detail page gets a "Last sign-in from" field. Locally
  (no Vercel edge) only the IP is available; old logins show "location unknown".
- **Users & Accounts redesign** — avatar initials (stable per-user color), stacked
  email/name/role identity cell linking to the detail page, merged status badges,
  synced-dot mailbox cell, row hover, location under last sign-in.
- ⚠️ **Supabase URL config (user action, told in chat):** Site URL →
  `https://vesta-ai-radar.vercel.app`; Redirect URLs → add
  `https://vesta-ai-radar.vercel.app/**` and `http://localhost:3000/**` (the bare
  domain without `/**` only matches the homepage, which is why the reset link fell
  back to the Site URL).

## Admin Wave 4 (merged `3016c60`)

**Settings are now real levers (the Wave 3 gap):**
- `lib/ai/runtime.ts` — `getEffectiveAi(userId, task)`: env overlaid with
  app/user_settings → per-task **model** (analysis/draft), **provider override**,
  **max per run/day**, **prices**, **reply-intent mode** (user → global → env),
  **ai_paused**, and **daily cost caps** (user + global, checked against today's
  ledger). Wired into analysis (`lib/ai/store.ts`), drafts, and ✨ capture (falls
  back to the deterministic parser when blocked). `getEffectiveSendMode(userId)`
  drives sendDraft + capabilities (user → global → env `DRAFT_SEND_MODE`).
- **Scan-back enforced**: first enumeration of a mailbox (no delta_link yet) skips
  mail older than the admin window (default 7d) — `lib/sync/scanback.ts` (tested).
- **Scheduled purge**: `GET/POST /api/cron/purge` (CRON_SECRET) = soft-delete grace
  purge + per-user retention; records purge_jobs + an audit row. Schedule daily in
  pg_cron alongside /api/cron/sync.
- **Webhook subscriptions**: Mailboxes tab shows each sub's state
  (active/expiring/expired/none + expiry) with a **Renew webhook** button.
- **Users**: **Export data** (JSON download, audit-logged) +
  **Re-trigger onboarding** on the user detail page.

**Feedback fixes (from live testing):**
- **Reset-password link fixed** — it used to 404/dead-end: recovery tokens arrive
  in the URL #hash (implicit flow) and Supabase fell back to the Site URL. Now the
  email lands directly on `/auth/update-password`, which consumes the hash
  client-side (verifying → form → expired states); `/login` also rescues stranded
  recovery hashes. ⚠️ **Supabase setting needed:** Authentication → URL
  Configuration → add `http://localhost:3000/**` and the production domain to
  **Redirect URLs**, or Supabase keeps ignoring the redirect.
- **Triage tab**: default shows the **10 newest rules/memories** across users +
  a **user dropdown** for the full per-user set.
- **AI page**: glossary removed → **hover tooltips** on every KPI and settings
  field (ⓘ dots); cost rollups now **estimate from tokens × configured rates when
  a row has no stored cost** (so backfilled history shows real dollars).
- Native `<select>` options were white-on-white in dark mode → themed globally.

## Admin Wave 3 (merged `c2d5605`)

- **AI usage fixed (was all zeros):** the panel reads the `ai_usage` ledger, but only
  analysis/reply-intent wrote to it → wired **drafts** + **✨ quick-capture** in (success
  + failure rows); **admin-panel token prices now drive cost estimates**
  (`estimateCostUsd(model, usage, rates)`; `getConfiguredAiRates()`); **backfill**:
  `node scripts/backfill-ai-usage.mjs` copies historical `ai_analyses` → `ai_usage`
  (idempotent, preserves timestamps). Set prices in AI Control Center → Model & budgets.
- **Admin lockdown:** "Back to app" + `?app=1` removed; middleware keeps admins inside
  `/admin` (any app route redirects there). Claim-based — no extra DB read.
- **Suspension now ENFORCED:** Suspend = Supabase ban (`ban_duration`) +
  `app_metadata.suspended` claim; middleware signs the session out (cookie-safe) →
  `/login?error=suspended` shows a notice. Previously cosmetic.
- **Users:** **Set password** (manual, ≥8 chars, never logged) beside the email reset;
  reset email now lands on a real **`/auth/update-password`** page (was a dead end);
  **per-user detail page `/admin/users/[id]`** (identity, **timezone editor** →
  `profiles.timezone`, mailbox/sync, counts, overrides, recent drafts, AI month,
  **activity history**); **logins recorded** to `audit_logs` (password + OAuth paths).
- **Tables everywhere:** shared `components/admin/DataTable.tsx` (search, facet
  filters, sortable headers, pagination) applied to Users / Mailboxes / Email storage /
  Drafts (500-row window + status/model facets) / Audit (500, action/actor facets,
  tones) / Triage. **Rules & memories are search-first** (type a user's email ≥2 chars).
- **AI Control Center:** glossary panel ("what these numbers mean") + an amber banner
  when token prices are unset ($0.00 explanation).
- ⚠️ Verify after merge: suspend the dev user → confirm blocked + notice; set prices →
  generate a draft → AI page shows the call + cost; run the backfill script once.

## 🛠️ Admin Panel (Operator Console) — DONE

`/admin`, gated on the Supabase **`app_metadata.is_admin`** auth claim — NOT
`profiles.role` (onboarding writes the job title there, which was clobbering admin;
fixed). Non-admins get a 404. Reuses login + splash + theme; both light/dark; nav
prefetch + loading skeletons; every mutating action behind a typed confirm + audit-log.

- **Wave 1:** Overview/Health · Users (reset pw, make/revoke admin via auth API,
  suspend, hard-delete) · Mailboxes & Sync (force sync, re-process) · Email & Retention
  (scan-back/retention/grace, purge soft-deleted, apply retention, per-user wipe,
  storage-by-user) · AI Control Center (usage ledger, spend by feature/user, model +
  budget overrides, re-analyze, key status).
- **Wave 2:** Triage & Rules (manager_rules/memories toggle+delete, feedback stream) ·
  Drafts & Sending (oversight + KPIs + send mode, delete stuck drafts) · Audit &
  Security (audit-log viewer + action filter, secrets presence status, admins list).
- **Deferred:** impersonation ("view as user").
- Code: `lib/admin/*`, `app/(admin)/admin/*`, `components/admin/*`. Migration
  `supabase/migrations/20260609170001_admin_panel.sql` (applied). AI usage recorded to
  `ai_usage` from `lib/ai/store.ts`.

**Admin account:** `ali.alzein.eng@gmail.com` (app_metadata.is_admin=true). Manage
admins from the Users tab, or `node scripts/grant-admin.mjs <email>` /
`node scripts/create-admin-user.mjs <email>` (both set the app_metadata claim).
Admins logging in are auto-forwarded from `/` to `/admin` (escape hatch: `/?app=1`).

> ⚠️ Change the admin password (it was shown in chat). The stale role-based
> `is_admin()` SQL function in the migration is harmless (panel uses the service role);
> optionally realign it to app_metadata later.

## Where we are

- **Phases 0–6.5: done** — dashboard, auth + SSO, onboarding, Outlook connect, email
  sync (delta + webhooks + background), follow-up engine, email triage. (See
  `docs/plans/phases.md` for the master status.)
- **Phase 7 (AI Analysis): DONE.** After each sync, AI reads each "waiting on you"
  thread and fills its summary / category / refined priority / deadline / next action
  / user-visible reason → the rail's **Next Best Action**, **Why this matters**,
  summary, and ranking are real AI output. Token + cost tracked in `ai_analyses`;
  bounded by `AI_MAX_PER_RUN` (20) / `AI_MAX_PER_DAY` (200); analyzed once per change.
  - Provider abstraction in `lib/ai/` — provider/model/key from env
    (`AI_PROVIDER`/`AI_MODEL`/`AI_API_KEY`). **Currently OpenAI `gpt-5.4-mini`.**
    Swappable later from the admin panel; an Anthropic adapter slots in unchanged.
  - Latest fix: corrected category direction (a person waiting on the manager →
    `waiting`; automated/no-reply/closed-ticket → `fyi`). Verified live.

## 🆕 Phase 9 — Draft Replies (merged to `main`, commit `bcc93c2`)

Generate → edit → **approve** → send a threaded Outlook reply; draft-first, never
auto-sent; every send audit-logged. **No migration** (reused Phase 1 `draft_replies`
+ `audit_logs`).

- **AI**: `lib/ai/draft.ts` (prompt + parser: subject/body/tone/warnings/
  requires_human_review; tone pulled from onboarding `manager_memories`). Pure helpers
  `lib/email/reply.ts` (reply/reply-all recipients, HTML body compose, deterministic
  sensitive-topic net). Graph send `lib/graph/send.ts` (createReply→PATCH body→send).
- **Actions** `app/actions/drafts.ts`: `generateDraft` / `ensureBlankDraft` (manual /
  AI-off path) / `saveDraft` / `sendDraft` / `discardDraft` / `loadDraftForItem`. Send
  writes `audit_logs` (`email_sent`, service role) and marks the work item **done**
  (resurfaces on reply).
- **UI**: `components/dashboard/DraftComposer.tsx` (slide-over: recipients, reply-all,
  subject, tone chips, instruction, editor, cautions, safety copy, Regenerate / Save /
  Approve & Send). Opened from the AI rail Action/Draft tabs + the Morning Brief
  "Draft Replies" quick action. Dashboard loads existing drafts (`canDraft` / `draft`
  on `WorkItem`).
  - **Editable recipients**: To/Cc/Bcc show as chips with the real addresses — remove
    any, add more (incl. Bcc); reply-all toggle re-seeds To/Cc. Send goes to exactly
    the final list.
- **Sending (`fix 6a7aa2f`)**: uses the Graph **`reply` action** (needs only
  **`Mail.Send`**) with our composed HTML (reply + quoted original built from the
  stored message) + the exact edited To/Cc/Bcc — one call, threaded, saved to Sent.
  ⚠️ **Do NOT switch back to `createReply` for sending** — it creates a draft and needs
  `Mail.ReadWrite` (that was the original "Outlook refused to send" 403). `createReply`
  is used only by `DRAFT_SEND_MODE=draft_only` (which then needs `Mail.ReadWrite`).
- **Scopes**: `Mail.Read` + `Mail.Send` (`lib/graph/oauth.ts`); `hasSendScope` gates the
  UI; Settings + composer show **"Reconnect to enable sending"** for mailboxes connected
  pre-Phase 9.
- **Tests**: `lib/ai/__tests__/draft`, `lib/email/__tests__/reply`,
  `lib/graph/__tests__/send`, `components/__tests__/DraftComposer`; updated the rail +
  dashboard tests (old "Approve Draft" placeholder removed). Guide:
  `docs/guides/draft-replies.md`.

### ✅ Verified live (Phase 9) — done on the work laptop 2026-06-09
- Reconnected Outlook (granted `Mail.Send`) → Settings shows **"Sending replies:
  Enabled"**. Generated a draft, edited it, **Approve & Send** → arrived in Outlook as a
  threaded reply; item left the radar. Working end to end.
- Optional re-checks on the home laptop if you want: a **sensitive-topic** thread
  (expect the "Check before sending" caution) and **Bcc**/recipient removal.

## 🆕 Shipped earlier (all merged to `main`)

- **Sync flag fix (`bb3cb74`)** — Graph delta updates (flag/read/importance) now land
  on already-stored messages; the insert-only upsert used to drop them, so a newly
  flagged email stayed hidden in flagged-only mode. Volatile fields updated per
  message after the insert. Verified live (re-flagging an email now surfaces it).
- **Phase 8 Slice A** — radar **Unread** dot; **Done / Dismiss / Snooze** actions in
  the AI rail (`app/actions/work-items.ts`); a *dismissed OR done* thread **resurfaces**
  when the sender replies again (sync compares `metadata.resolved_at` vs latest
  inbound). Snooze presets + the dashboard re-surfaces snoozed items when due.
- **Phase 8 Slice B** — **quick-add manual tasks** with deterministic NL date parsing
  (`lib/tasks/parse.ts`, no AI), stored as `source='manual'`, new `task` category +
  radar filter. Add-a-task box above the radar.
- **Done vs Dismiss:** both clear the radar and both reopen on a new reply; *Done*
  records a completion (for Weekly Review), *Dismiss* = "didn't need me".

## ✅ Verify first (next session)

- The Phase 8 actions on the live dashboard: select a card → rail → **Mark done /
  Dismiss / Snooze**; add a task ("Call vendor tomorrow 3pm") and confirm it lands on
  the radar under **Tasks** with the right due time.

## ✅ Phase 8 Slice C: "Waiting on them" (Q3) — DONE

When the manager replies asking for something, the thread now becomes a **Waiting on
them** item (own category + Radar filter chip) instead of vanishing; it flips back to
**Waiting on you** when the recipient replies.
- **Detection:** pure pre-gate `lib/engine/replies.ts` gates creation in
  `buildWorkItemDrafts` (`isWaitingOnOther`); scored so older = higher.
- **AI confirm (part 2):** `lib/ai/reply-intent.ts` + the branch in `lib/ai/store.ts`
  read the **manager's own reply**, confirm it expects a response (writes summary /
  next-action) or **demote** (`status='dismissed'`, resurfaces if the recipient later
  replies — the sync also re-adopts the engine category on resurface).
- **Mode** `AI_REPLY_INTENT_MODE` = `pregate_ai` (default) | `ai_always` | `heuristic`
  | `off`. Env now; per-user admin-panel control is in `admin-panel-plan.md`.
- ⚠️ **Verify live:** reply to a thread asking a question → it should appear under the
  **Waiting on them** filter; a "thanks" reply should not.

## Other open tracks (pick next)

- **Phase 9 — Draft replies — DONE + verified live.** ✅
- **Phase 10 — Memory & Rules** (recommended next; drafting already reads tone
  memories, so deeper memory retrieval + a control UI fit here).
- **Admin panel — Wave 1** (retention/purge, **initial-sync scan window** — default
  last 7 days, see `admin-panel-plan.md` §2 — AI usage UI + budgets + **reply-intent
  mode per user**, sync/cron health).
- **AI polish** — show `ai_analyses` cost in the UI; a "Re-analyze" button.

## ⚠️ Open reminders / TODO

- ✅ **Reconnect Outlook for sending — DONE** (work laptop, 2026-06-09; `Mail.Send`
  granted, send verified live). For **deployment**, ensure `Mail.Send` is on the Azure
  app's delegated permissions so production can send too.
- 🔑 **Rotate the OpenAI API key** — it appeared in chat (treat as exposed). Then
  update `.env.local` and Vercel.
- 💲 Set `AI_PRICE_INPUT` / `AI_PRICE_OUTPUT` (gpt-5.4-mini USD per 1M tokens) so
  `ai_analyses.cost_estimate_usd` populates (tokens are already tracked).
- ☁️ Vercel env vars: ensure `AI_PROVIDER` / `AI_MODEL` / `AI_API_KEY` (+ all
  Supabase / MS Graph / `CRON_SECRET` / `MS_GRAPH_WEBHOOK_URL`) are set in the Vercel
  project for the deployed app.
- 🔐 Pre-launch: rotate Supabase service-role key + DB password + MS Graph secret
  (shared in chat); re-enable Supabase "Confirm email"; remove the dev user.
- ⏰ Schedule `pg_cron` + set `MS_GRAPH_WEBHOOK_URL` for live background sync/webhooks
  (Phase 5 config).

## 🆕 New-laptop setup (per machine)

- `.env.local` is gitignored and does **not** travel. Recreate it on each laptop:
  Supabase URL/keys, MS Graph client id/secret, `TOKEN_ENCRYPTION_KEY`,
  `AI_PROVIDER` / `AI_MODEL` / `AI_API_KEY`. Template: `.env.example`.
- `npm install` (installs deps incl. `openai`).

## 🔧 Handy commands

- Re-analyze items: `node scripts/reanalyze-work-items.mjs` → then open the dashboard.
- Smoke-test AI: `node scripts/test-ai.mjs`.
- Wipe synced mail for a clean re-sync: `node scripts/clear-synced-mail.mjs`.
- Checks: `npm run typecheck` · `npm test` · `npm run lint` · `npm run build`.

---

*Maintained by Claude per `CLAUDE.md` — updated at the end of each session and pushed.*
