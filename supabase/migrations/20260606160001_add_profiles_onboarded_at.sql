-- Migration: profiles.onboarded_at
-- Phase 2c — First-run onboarding wizard
--
-- Tracks whether a user has completed (or skipped) the first-run onboarding
-- wizard. NULL = not onboarded yet → the app routes them to /onboarding.
-- Set to now() when the wizard is completed or skipped.

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

comment on column public.profiles.onboarded_at is
  'When the user finished/skipped first-run onboarding. NULL = show the onboarding wizard.';
