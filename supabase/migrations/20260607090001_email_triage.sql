-- Migration: email triage (manager-controlled inclusion of synced mail)
-- Phase 6.5 — Email Triage
--
-- Lets the manager control which emails Vesta imports as actionable, so noisy
-- mailboxes (alerts, newsletters, automated notifications) don't drown real work.
--
-- REUSES existing structures — no new tables:
--   * manager_rules  : rule_type='suppression' (mute) / 'allow' (force-include),
--                      conditions jsonb {match: sender|domain|subject, value}.
--                      ('allow' is an additive value for the existing free-text
--                      rule_type vocabulary; no constraint change.)
--   * people.is_vip  : VIP senders are always imported.
--   * sync_cursors   : last_success_at / delta_link already support incremental
--                      "only new since last sync" — no schema change needed.
--
-- This migration ONLY adds:
--   * mailboxes.triage_mode        — the per-mailbox lens
--   * email_messages.excluded_at   — mark mail hidden by triage (kept for review)
--   * email_messages.excluded_reason / triage — the human + structured "why"
--
-- Non-breaking: existing mailboxes default to 'focused'; existing messages get
-- excluded_at = NULL (visible), preserving current behaviour for already-synced mail.

-- ---------------------------------------------------------------------------
-- mailboxes.triage_mode — what Vesta imports as actionable
-- ---------------------------------------------------------------------------
alter table public.mailboxes
  add column triage_mode text not null default 'focused'
    check (triage_mode in ('focused', 'flagged', 'everything'));

comment on column public.mailboxes.triage_mode is
  'What Vesta imports as actionable work: focused (Outlook Focused Inbox minus automated/bulk senders), flagged (only flagged mail), everything (import all). Manager-controlled in Settings.';

-- ---------------------------------------------------------------------------
-- email_messages — mark mail hidden by triage (kept so the manager can review)
-- ---------------------------------------------------------------------------
alter table public.email_messages
  add column excluded_at timestamptz,                      -- NULL = visible/imported; set = hidden by triage
  add column excluded_reason text,                         -- human reason, e.g. 'Newsletter (unsubscribe header)'
  add column triage jsonb not null default '{}'::jsonb;    -- structured signals/decision for the review UI + tuning

comment on column public.email_messages.excluded_at is
  'When triage hid this message (NULL = visible). Hidden mail is retained so the manager can review and override (one-click allow).';
comment on column public.email_messages.excluded_reason is
  'Human-readable reason the message was hidden, shown in the Hidden review.';
comment on column public.email_messages.triage is
  'Structured triage detail (mode, signals that fired, matched rule, inferenceClassification) for transparency and tuning.';

-- Fast "visible inbox" and "hidden review" queries (filter by excluded_at, newest first).
create index email_messages_visible_idx
  on public.email_messages (mailbox_id, excluded_at, received_at desc);
