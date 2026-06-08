# Session Handoff — Vesta

> **Read this first** when starting a new session (then `git pull`). This is the
> living status + next-steps file that travels across laptops/sessions via git.
> Claude updates it at the end of each session and pushes it.

**Last updated:** 2026-06-09 (end of session)
**Repo state:** `main`, clean — all work merged.

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
- **Fixes shipped this session (all merged):**
  - **Category direction** — a person waiting on the manager → `waiting`; automated /
    no-reply / closed-ticket → `fyi`. Verified live.
  - **Clobber bug** — the follow-up engine was overwriting AI-owned fields
    (`category`/`priority`/`summary`/`urgency_reason`) on every sync, reverting the
    AI result (badly, since the cron runs every minute). Engine now leaves AI-owned
    fields alone once `last_analyzed_at` is set.
  - **Open-page real-time** — on a deployment the cron keeps `last_sync_at` fresh, so
    the browser `AutoSync` bailed early and never refreshed. It now `router.refresh()`
    es every ~60s to reflect cron/webhook DB updates (sync-trigger is now a local-dev
    fallback only). Setup: **Vercel + pg_cron every 1 min**.

## ✅ Verify first (next session)

- Open the deployed dashboard; confirm the 3 test items settled: **Test 2 → Waiting
  on you (~74)**, **TeamViewer + Meta → FYI**. `last_analyzed_at` was cleared at end
  of last session, so once the Vercel deploy has the clobber fix the next 1-min cron
  re-analyzes and it **sticks**.
- Use **`node scripts/ai-status.mjs`** to see what AI actually wrote (work_items vs
  ai_analyses + errors) if anything looks off.

## What's next (pick one)

- **Phase 8 — Manual tasks & reminders** (quick add, NL parser, snooze/done). The
  rail's **Snooze** button currently says "Phase 8".
- **Phase 9 — Draft replies** (generate → edit → **approve** → send via Graph +
  audit). The rail's **Approve Draft / Edit** and **Draft Replies** say "Phase 9".
- **Admin panel — Wave 1** (email retention/purge, AI usage UI + budgets,
  re-analysis controls, sync/cron health). Plan: `docs/plans/admin-panel-plan.md`.
- **AI polish** — show `ai_analyses` cost in the UI; a "Re-analyze" button (instead
  of the script); optionally surface the AI reason distinctly.
- **Instant real-time** — set `MS_GRAPH_WEBHOOK_URL` to the public Vercel URL +
  ensure the Graph subscription is created, so new mail is *pushed* (no ~1-min cron
  wait). Endpoint already built (`app/api/outlook/webhook`); dormant without the URL.

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

- Inspect what AI did: `node scripts/ai-status.mjs` (work_items vs ai_analyses).
- Re-analyze items: `node scripts/reanalyze-work-items.mjs` → then open the dashboard.
- Smoke-test AI: `node scripts/test-ai.mjs`.
- Wipe synced mail for a clean re-sync: `node scripts/clear-synced-mail.mjs`.
- Checks: `npm run typecheck` · `npm test` · `npm run lint` · `npm run build`.

---

*Maintained by Claude per `CLAUDE.md` — updated at the end of each session and pushed.*
