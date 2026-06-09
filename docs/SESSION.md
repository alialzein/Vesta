# Session Handoff — Vesta

> **Read this first** when starting a new session (then `git pull`). This is the
> living status + next-steps file that travels across laptops/sessions via git.
> Claude updates it at the end of each session and pushes it.

**Last updated:** 2026-06-09 (Phase 8 in progress)
**Repo state:** `main`, clean — Phase 8 Slices A + B merged; Slice C (Waiting-on-them) NOT started.

---

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

## 🆕 Shipped this session (all merged to `main`)

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

## ▶ Next up — Phase 8 Slice C: "Waiting on them" (Q3) — DESIGNED, not built

When the manager replies asking for something, the item must NOT vanish — it should
flip to **waiting on them** (manager owed a reply). Decisions already made:
- **AI decides** reply-intent, but **default = deterministic pre-gate then AI** (skip
  obvious "thanks/done" replies for free; AI judges only plausible asks). The mode
  (`pregate_ai` | `ai_always` | `heuristic` | `off`) must be **env-driven now and
  per-user admin-panel-controllable later** — add to `admin-panel-plan.md`.
- Build steps: (1) `buildWorkItemDrafts` creates items for `isWaitingOnOther` threads
  (engine already exposes this) gated by a pure reply-intent pre-gate; (2) the AI step
  reads the **manager's reply** (not latest inbound) for these and confirms/demotes;
  (3) the AI prompt already has a `followup` = "waiting on someone else" notion to
  reuse. **OPEN DECISION:** taxonomy/surfacing — new `waiting_on_them` category + filter
  (like `task`) vs. repurpose `followup`. Ask the owner before building.
- Scoring note: for waiting-on-them, *older* = more concerning (opposite of the
  recency boost in `scoreThread`) — adjust or let AI own the priority.

## Other open tracks (pick after Slice C)

- **Phase 9 — Draft replies** (generate → edit → **approve** → send via Graph + audit).
- **Admin panel — Wave 1** (retention/purge, **initial-sync scan window** — default
  last 7 days, see `admin-panel-plan.md` §2 — AI usage UI + budgets + **reply-intent
  mode per user**, sync/cron health).
- **AI polish** — show `ai_analyses` cost in the UI; a "Re-analyze" button.

## ⚠️ Open reminders / TODO

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
