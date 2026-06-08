# Vesta Docs — Start Here

This is the map of the `docs/` folder. If you're ever unsure where something lives,
start on this page.

Everything is organized into **five buckets** (plus this map):

| Folder | Tag | What's in it |
|--------|-----|--------------|
| [guides/](guides/) | 👤 User guide | Plain-language manual for the end user (the manager) |
| [plans/](plans/) | 📋 Plan | Status + everything we intend to build (current & future) |
| [product/](product/) | 🎯 Product | Vision, workflows, and UX specs |
| [reference/](reference/) | 📖 Reference | How the system already works (architecture + database) |
| [standards/](standards/) | 📐 Spec / Rule | Rules to follow when building (ai, security, testing, templates) |
| [archive/](archive/) | 🗂️ Historical | Design history, demo notes, the original plan |

---

## 1. Where we are right now

**The single source of truth for status is [plans/phases.md](plans/phases.md).**
It lists every phase and whether it's done.

At a glance:

- ✅ **Done:** Phases 0–6.5 — dashboard, auth + SSO, onboarding, Outlook connect,
  email sync (delta + webhooks + background), follow-up engine, email triage.
- 🔜 **Next:** **Phase 7 — AI Analysis** (summaries, classification, prioritization,
  deadlines, suggested actions, cost/token tracking). First phase that calls AI.
- 🔭 **Later:** Phases 8–14 (tasks/reminders, draft replies, memory, daily brief,
  differentiating features, Teams, multi-user).

---

## 2. Plans & future work  ← read this to know "what's planned"

Every plan, with its status. These all live in [plans/](plans/):

| Plan | Status | What it covers |
|------|--------|----------------|
| [plans/phases.md](plans/phases.md) | ⭐ Live | **The master plan** — phase-by-phase status & scope |
| [plans/feature-roadmap.md](plans/feature-roadmap.md) | Live | High-level roadmap (waves A–F) |
| [plans/auth-onboarding-and-mailbox-plan.md](plans/auth-onboarding-and-mailbox-plan.md) | Mostly built | Login, onboarding, and mailbox-connection direction |
| [plans/triage-ai-safety-net.md](plans/triage-ai-safety-net.md) | 🔭 Future (Phase 7) | Cost-aware AI to stop important mail being wrongly hidden |
| [plans/admin-panel-plan.md](plans/admin-panel-plan.md) | 🔭 Future | Operator panel: users, email retention/purge, health, AI billing |
| [plans/personal-intelligence-brief-plan.md](plans/personal-intelligence-brief-plan.md) | 🔭 Future (separate track) | "Briefing" page — build only after the core is stable |
| [plans/codex-task-backlog.md](plans/codex-task-backlog.md) | Historical | Early task-by-task backlog (mostly completed) |
| [plans/handoff-checklist.md](plans/handoff-checklist.md) | Reference | Checklist before switching machines / stopping work |
| [plans/prompts-to-use.md](plans/prompts-to-use.md) | Reference | Reusable prompts for driving the build |

> **Rule of thumb:** a new *future* idea becomes a 📋 Plan doc in [plans/](plans/) and
> gets a row in this table. When it ships, its status moves to ✅ in
> [plans/phases.md](plans/phases.md) and it gains a 👤 user guide in [guides/](guides/).

---

## 3. The folder map (detail)

### 👤 [guides/](guides/) — for the end user
The user manual (how filtering works, inbox, dashboard, connecting Outlook, etc.).
Start at [guides/README.md](guides/README.md).

### 📋 [plans/](plans/) — status & plans
The master plan and every current/future plan doc. Listed in section 2 above.

### 🎯 [product/](product/) — product direction
- [vision-and-principles.md](product/vision-and-principles.md)
- [top-3-dashboard-features.md](product/top-3-dashboard-features.md)
- [workflows.md](product/workflows.md)
- [dashboard-ux-spec.md](product/dashboard-ux-spec.md)

### 📖 [reference/](reference/) — how the system works
- [reference/architecture/](reference/architecture/) — [overview.md](reference/architecture/overview.md),
  [project-structure.md](reference/architecture/project-structure.md), Next/Supabase,
  queues & cron, Microsoft Graph, and setup guides (auth providers, Outlook connect).
- [reference/database/](reference/database/) — [schema-v1.md](reference/database/schema-v1.md),
  [data-dictionary.md](reference/database/data-dictionary.md), RLS rules, migration
  checklist, portability. (Also the rules for any schema change.)

### 📐 [standards/](standards/) — rules to follow when building
- [standards/ai/](standards/ai/) — prompt contracts, output schemas, AI agent/behavior/safety rules.
- [standards/security/](standards/security/) — [security-rules.md](standards/security/security-rules.md), [audit-logging.md](standards/security/audit-logging.md).
- [standards/testing/](standards/testing/) — testing strategy, unit/integration/e2e, QA scenarios.
- [standards/templates/](standards/templates/) — reusable templates for tasks, feature specs, test plans, DB-change requests.

### 🗂️ [archive/](archive/) — historical
- [archive/design/](archive/design/) — visual direction and per-phase UI plans (how the look evolved).
- [archive/demo/](archive/demo/) — what's real vs. placeholder in demo states.
- [archive/mockups/](archive/mockups/) — original mockups.
- [archive/START_HERE.md](archive/START_HERE.md) — original project bootstrap notes.
- [archive/original-technical-plan.md](archive/original-technical-plan.md) — the very first technical plan.

---

## Quick answers

- **"What are we building next?"** → [plans/phases.md](plans/phases.md) (Phase 7).
- **"What's planned for the future?"** → section 2 above.
- **"How does feature X work for a user?"** → [guides/](guides/).
- **"What are the rules for changing the database / AI / security?"** →
  [reference/database/](reference/database/), [standards/ai/](standards/ai/), [standards/security/](standards/security/).
