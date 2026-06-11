-- Migration: Reminders engine — Phase B of chat orders (owner approved
-- 2026-06-11: "please proceed with phase B")
--
-- The `reminders` table has existed since Phase 1 (schema-v1) but no
-- processor was ever built. This migration EXTENDS it into the email
-- reminder engine ("email me about this thread at 3pm, hourly, 3 times"):
-- a cron route (/api/cron/reminders) picks due rows and sends through the
-- existing Graph Mail.Send path; recurring reminders advance remind_at until
-- remaining_sends hits zero.
--
-- Reused columns: title = the reminder subject; remind_at = the NEXT firing
-- time (UTC); timezone = the manager's tz at creation. Own-rows RLS already
-- exists (Phase 1 owned-tables policy). The table is empty in practice, so
-- the new columns need no backfill.
--
-- The manager sees and cancels active reminders in Settings → Scheduled
-- reminders.

alter table public.reminders
  add column if not exists send_to_email text,
  add column if not exists body text,
  add column if not exists repeat_every_minutes integer,         -- null = one-shot
  add column if not exists remaining_sends integer not null default 1,
  add column if not exists sent_count integer not null default 0,
  add column if not exists created_from text not null default 'chat';

comment on table public.reminders is
  'Scheduled email reminders (chat orders Phase B). title=subject, remind_at=next firing (UTC). Cron-sent via Graph Mail.Send. User-owned.';

-- (reminders_due_idx on (status, remind_at) already exists from Phase 1.)
