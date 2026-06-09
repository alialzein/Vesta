# Session Handoff — Vesta

> **Read this first** when starting a new session (then `git pull`). This is the
> living status + next-steps file that travels across laptops/sessions via git.
> Claude updates it at the end of each session and pushes it.

**Last updated:** 2026-06-09 (Admin Panel — Wave 1 + Wave 2 — BUILT & merged ✅)
**Repo state:** Phases 0–9 done. **Admin Panel (full operator console) merged to
`main`** — all 8 tabs live at `/admin`. Migration applied. Dedicated admin account
created. 272 tests green, typecheck + lint + build clean. Deployed to Vercel.

Earlier this session: **Phase 9 (Draft Replies) merged AND verified live**. Mailbox
connection + `Mail.Send` grant live in Supabase (shared across laptops).

---

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
