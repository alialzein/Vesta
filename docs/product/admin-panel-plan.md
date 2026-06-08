# Admin Panel — Planning Doc

> **Status: planning only.** Nothing here is built yet. This captures what the
> internal **admin/operator panel** must eventually do, so we design data and
> features with it in mind. Several items below require **new database tables** —
> those are proposed and approved separately (per `CLAUDE.md`), not as part of this
> doc.

The admin panel is for **us (the operators)**, not for managers using Vesta. It's a
separate, role-gated surface (`profiles.role = 'admin'` or a dedicated admin table)
that must never be reachable by normal users.

## Why we need it

As Vesta moves from a single pilot user toward multiple managers, we need one place
to support users, control their data, watch system health, and keep AI cost under
control. Building features now with the panel in mind avoids painful retrofits.

---

## 1. User & account management

- List all users (role, signup date, onboarding status, mailbox connected y/n,
  last active, last successful sync).
- **Reset a user's password** / trigger a password-reset email.
- Suspend / re-enable an account.
- **Delete a user** and all their data (GDPR-style hard delete).
- Re-send / re-trigger onboarding.
- Support impersonation ("view as user") — read-only, audit-logged, behind an
  extra confirmation. (Privacy-sensitive; gate carefully.)

## 2. Data control & email retention  ← the trigger for this doc

Today Vesta keeps a copy of all synced mail and only **soft-deletes** removed
messages; there is **no automatic clean-up**, so storage grows forever. The panel
owns the policy controls:

- **Retention window** — configurable per user or global default (e.g. "keep mail
  for 6 / 12 / 24 months"). Mail older than the window is purged.
- **Hard-delete of soft-deleted mail** — permanently clear rows marked
  `deleted_at` after a grace period (e.g. 30 days), so "deleted in Outlook" really
  frees storage over time.
- **Manual purge / "wipe synced mail"** per user (productionizes the existing
  `scripts/clear-synced-mail.mjs`, keeping tokens so a clean re-sync is possible).
- **Storage usage per user** — message counts, oldest record, hidden vs visible
  split — so we can spot a runaway mailbox.
- **Export a user's data** (portability / support).

> Implementation note: needs a retention setting (per-user or global) and a
> scheduled purge job (extend the existing cron). New columns/tables → migration
> approval required.

## 3. System health & operations

- **Sync health** across all users: last run, success/failure, error messages,
  stale mailboxes.
- **Cron health**: are the scheduled sync + subscription-renewal jobs running?
- **Webhook subscriptions**: which are active, expiring soon, or dead (Graph
  subscriptions expire ~every 3 days and must be renewed).
- **Queue depth**: backlog of `webhook_events` waiting to drain.
- **Error feed**: recent sync/AI/auth errors with enough detail to act.

## 4. AI billing, usage & cost control

This is critical because AI cost scales with usage and can surprise us.

- **Usage tracking** per user and per feature (triage assist, analysis, drafts,
  briefs): tokens in/out, request count, model used.
- **Cost estimates** rolled up daily / monthly, per user and total.
- **Budgets & caps** — per-user and global token/cost ceilings; when exceeded, fall
  back to non-AI heuristics rather than overspending.
- **Model selection** — choose the model per task (cheap model for classification,
  stronger model for drafting) and change it without a code deploy.
- **Rate limits** to protect against runaway loops.

> Needs an `ai_usage` ledger table written on every AI call. Design this **before**
> Phase 7 ships so we capture usage from day one. Migration approval required.

## 5. Security & audit

- **Audit log viewer** — sensitive actions (impersonation, data wipe, role changes,
  token access) with who/when/what.
- **Key rotation reminders / status** (we already have a standing rotation TODO).
- Visibility into RLS-protected access; confirm no cross-user leakage.

---

## Phasing

We don't build the whole panel at once. Two waves:

**Wave 1 — "minimal ops" (needed around launch):**
- Email **retention + hard-delete purge** job (storage can't grow unbounded).
- **AI usage ledger + cost view + a global budget cap** (don't fly blind on cost).
- Basic **sync/cron/webhook health** read-out.

**Wave 2 — full panel (aligns with multi-user expansion, roadmap Phase F / phases
Phase 14):**
- Full user management (reset/suspend/delete/impersonate).
- Per-user retention controls, exports.
- Audit log viewer, model selection UI, per-user budgets.

## Related

- `docs/guides/email-sync.md` — the user-facing note that old mail isn't auto-purged yet
- `docs/product/feature-roadmap.md` — Phase F (company-wide expansion)
- `docs/implementation/phases.md` — Phase 14 (multi-user)
- `docs/ai/triage-ai-safety-net.md` — cost-aware AI use (feeds the usage/budget design)
