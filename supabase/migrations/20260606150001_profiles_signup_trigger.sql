-- Migration: auto-create a profile row on user signup
-- Phase 2 — Auth and Profile
--
-- When a new auth.users row is inserted (signup), create the matching
-- public.profiles row so the app always has a profile for an authenticated
-- user. full_name/timezone are seeded from signup metadata when present.
--
-- SECURITY DEFINER so the trigger can insert into public.profiles regardless of
-- the calling role; search_path is pinned to avoid hijacking.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, timezone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Fire after each new auth user is created.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
