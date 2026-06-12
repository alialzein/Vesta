# Scheduled jobs (pg_cron) — setup & reference

Vesta's background work runs through five secured HTTP endpoints. The
scheduler is **Supabase pg_cron + pg_net** calling the production app —
host-agnostic, free, any frequency (no Vercel Pro cron needed). Every route
requires `Authorization: Bearer <CRON_SECRET>` (see `lib/cron/auth.ts`) and
no-ops safely when there is nothing to do.

| Job | Endpoint | Schedule | In prod? (checked 2026-06-12) | What it does |
|---|---|---|---|---|
| Mail sync | `/api/cron/sync` | every 1 min (`*/1 * * * *`) | ✅ `vesta-sync` | Delta-sync all connected mailboxes, drain webhook queue, rebuild threads + work items, AI analysis |
| Subscription renewal | `/api/cron/renew-subscriptions` | daily 06:00 (`0 6 * * *`) | ✅ `vesta-renew-subscriptions` | Renew Graph webhook subscriptions before their ~3-day expiry |
| Reminders | `/api/cron/reminders` | every 5 min | ✅ `vesta-reminders` | Send due scheduled reminder emails (Phase B chat orders) |
| Retention purge | `/api/cron/purge` | daily 03:00 | ✅ `vesta-purge` | Hard-delete soft-deleted mail past grace + apply retention windows |
| **Ops automation** | `/api/cron/ops` | every 15 min (`*/15 * * * *`) | ⏳ owner adding (merged in #84) | Cost-cap breach alarms, stale-sync self-heal, webhook-renewal failure alerts, 8am operator digest (Resend) |

```sql
-- Ops automation (PR #84) — run once in the Supabase SQL editor:
select cron.schedule(
  'vesta-ops',
  '*/15 * * * *',
  $$ select net.http_get(
       url     := 'https://vesta-ai-radar.vercel.app/api/cron/ops',
       headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
     ); $$
);
```

## Adding the missing jobs (run in the Supabase SQL editor)

> ⚠️ This creates rows in `cron.job` — a database change. Per project rules,
> the owner runs it (after reviewing) — do not let an assistant apply it.
> Replace `<CRON_SECRET>` with the production secret (same value as the
> Vercel env var). Never commit the real secret.

```sql
-- See what is already scheduled before adding anything:
select jobid, jobname, schedule, active from cron.job;

-- 1. Reminder emails — every 5 minutes (Phase B; "3:00 PM" fires 3:00–3:05).
select cron.schedule(
  'vesta-reminders',
  '*/5 * * * *',
  $$ select net.http_get(
       url     := 'https://vesta-ai-radar.vercel.app/api/cron/reminders',
       headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
     ); $$
);

-- 2. Retention purge — daily at 03:00 UTC.
select cron.schedule(
  'vesta-purge',
  '0 3 * * *',
  $$ select net.http_get(
       url     := 'https://vesta-ai-radar.vercel.app/api/cron/purge',
       headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
     ); $$
);
```

`cron.schedule` with an existing jobname **replaces** that job, so re-running
a statement updates the schedule instead of duplicating it.

## Verifying it works

```sql
-- The four jobs, their schedules, and whether they're active:
select jobid, jobname, schedule, active from cron.job order by jobname;

-- Recent runs + statuses (succeeded / failed):
select jobid, status, return_message, start_time
from cron.job_run_details
order by start_time desc
limit 20;
```

In the app: Settings shows "Last synced" advancing without a browser open;
a scheduled chat reminder ("email me a reminder at …") actually arrives;
admin → Mailboxes shows the webhook subscription staying active.

## Changing or removing a job

```sql
select cron.unschedule('vesta-reminders');  -- by jobname
```

Sync frequency note: the owner wants cadence to become an admin-panel
setting later (e.g. every 1 min) — until then, edit the schedule string here.

## Local development

There is no pg_cron pointing at localhost. Trigger manually:

```powershell
$secret = (Get-Content .env.local | Where-Object { $_ -match '^CRON_SECRET=' }) -replace '^CRON_SECRET=', ''
Invoke-WebRequest -Uri 'http://localhost:3000/api/cron/reminders' -Headers @{ Authorization = "Bearer $secret" } -UseBasicParsing
```

(The dashboard's `AutoSync` covers mail sync while a browser is open in dev.)
