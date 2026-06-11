# Chat Actions — giving Vesta orders (Plan, drafted 2026-06-11)

**Status: PROPOSED — owner requested 2026-06-11 ("yes i want chat order").
Phase A can start immediately; Phase B needs a migration approval; Phase C
needs the owner to grant new Microsoft Graph permissions in Azure.**

The goal: the manager types orders in Ask Vesta the way he'd tell a chief of
staff — and Vesta executes them through the SAME server actions the buttons
use, behind an explicit per-action confirmation tap. Vesta never acts
silently; the approval-gate principle survives everywhere.

## The core mechanism (all phases share it)

1. **Intent, not execution.** The chat prompt (chat-v3) gains an optional
   `action` field next to `reply`/`remember`:
   ```json
   { "reply": "...", "remember": [...],
     "action": { "kind": "snooze", "itemIndex": 2, "untilLocal": "2026-06-15 09:00" } }
   ```
   Work items are listed to the model with `[index]` — exactly the briefing's
   anti-hallucination trick: the model can only reference items we gave it;
   an invalid index drops the action.
2. **The parser is the gate.** `kind` must be in a whitelist; every field is
   validated/clamped in code. Anything off-contract → the action is dropped,
   the reply still shows.
3. **Confirmation card.** The proposed action renders as a card in the chat
   ("Snooze 'Cedars contract approval' until Mon Jun 15, 9:00 AM —
   [Confirm] [Cancel]"). Nothing happens until the manager taps Confirm.
4. **Executor server action.** `executeChatAction` re-validates ownership +
   whitelist server-side and calls the SAME actions the UI buttons call
   (`resolveWorkItem`, `snoozeWorkItem`, `createManualTask`, draft pipeline,
   Graph calendar in Phase C). Result lands back in the thread ("Done —
   snoozed until Mon 9:00 AM") and in `chat_messages.metadata.action`
   (proposal + status + executed_at) for a full audit trail.

## Phase A — in-app orders (no new permissions, no migration)

| Order (examples) | Action kind | Executes via |
|---|---|---|
| "Mark the Cedars item done" | `mark_done` | resolveWorkItem |
| "Snooze the TeamViewer thread until Monday 9am" | `snooze` | snoozeWorkItem (manager-tz wall time → UTC via lib/time/zone) |
| "Remind me to call Ahmad tomorrow 3pm" | `create_task` | createManualTask (radar item with due_at — same as Quick Add) |
| "Draft a reply to Zahraa: I can meet Thursday 2pm" | `draft_reply` | the existing draft pipeline with the manager's instruction; the draft waits in Draft Replies for approval — chat never sends |
| "Remember that…" | (already live) | memory learning loop |

UI: confirmation cards in both chat surfaces (full page + dock); executed
cards show a ✓ state. Tests: prompt/parser suite + executor validation suite
+ card component tests.

## Phase B — reminders engine (ONE migration + a Vercel cron)

For "send a reminder email to X at TIME" and "remind me about this thread
every hour, 3 times":

- **Table `reminders`** (DRAFT — needs owner approval before running):
  ```sql
  create table public.reminders (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles (id) on delete cascade,
    work_item_id uuid references public.work_items (id) on delete cascade,
    send_to_email text not null,            -- default: the manager himself
    subject text not null,
    body text,
    next_send_at timestamptz not null,      -- first/next firing time (UTC)
    repeat_every_minutes integer,           -- null = one-shot; 60 = hourly
    remaining_sends integer not null default 1,  -- "3 times" → 3
    sent_count integer not null default 0,
    status text not null default 'scheduled',    -- scheduled|done|cancelled|failed
    created_from text not null default 'chat',
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  -- + (user_id, status, next_send_at) index, set_updated_at trigger,
  --   own-rows RLS (same do-block as chat tables).
  ```
- **Scheduler:** a Vercel Cron hitting `/api/cron/reminders` every 5 minutes
  (the repo already has cron auth — `lib/cron/auth`). Each run: pick due
  `scheduled` rows, send via the existing Graph send path (Mail.Send is
  already used for approved drafts), decrement `remaining_sends`, advance
  `next_send_at` by `repeat_every_minutes`, mark `done` when exhausted.
- **Chat orders:** `create_reminder { itemIndex?, toEmail?, firstAtLocal,
  repeatMinutes?, count? }` — "remind Zahraa's thread hourly 3 times" works
  exactly like the owner described. Confirmation card shows the full plan
  ("3 emails to you, hourly from 2:00 PM, about 'technical meeting timing'").
- Bonus: this same table later powers the notifications bell (Phase 8
  leftover) — one engine, two outputs.
- Note: 5-minute cron granularity means "3:00 PM" fires between 3:00–3:05.

## Phase C — calendar & Teams meetings (owner action required in Azure)

For "what meetings do I have today?", "am I in the X meeting today?",
"schedule a Teams meeting with a@b.com tomorrow 3pm":

- **New Graph delegated scopes:** `Calendars.ReadWrite` (read today's
  calendar + create events with Teams links). The owner must add it to the
  Azure app registration and re-consent the mailbox connection. Until then,
  Phase C is blocked — everything else is code we control.
- **Read:** `GET /me/calendarView?startDateTime=…&endDateTime=…` (manager-tz
  day window) → today's meetings join the chat context (subject, time,
  organizer, attendees, online-meeting link). That answers both "what
  meetings today" and "was I added to X today" — and later feeds the real
  Meeting Prep feature.
- **Create:** `POST /me/events` with `isOnlineMeeting: true,
  onlineMeetingProvider: "teamsForBusiness"`, attendees from the order.
  Confirmation card first (title, time in manager tz, attendee list).
- **"With a specific number of people":** the model must NOT guess emails.
  It asks ("who are the 3 people? give me names or emails") and can match
  names against the senders Vesta already knows (the `people` table).

## Order of work

A → B → C. Each phase = one PR with tests + guide updates; B waits for the
migration approval, C waits for the Azure scope grant.

## Decided alongside this plan

- **Deleting a conversation does NOT delete what Vesta learned from it** —
  memories are the durable asset and live in Memory & Rules (deliberate).
  Each learned memory stores its `conversation_id` in metadata, so a future
  enhancement can offer "also forget the N things Vesta learned here" at
  delete time if the owner wants it.
