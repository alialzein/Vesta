# Settings & appearance

Everything about your mailbox connection, how aggressively Vesta filters, and how
Vesta looks lives in **Settings** (the gear icon in the top bar).

## The Outlook card

This is the control center for your mailbox connection:

- **Connect / Disconnect** — link or unlink your Outlook mailbox.
- **Test connection** — confirm Vesta can still reach your mailbox.
- **Sync now** — force an immediate refresh (Vesta also syncs automatically; see
  [How email stays in sync](email-sync.md)).
- **Status** — shows whether you're connected and when the last sync succeeded.
- **Sending replies** — whether Vesta may send your approved drafts. Shows
  "Reconnect to enable" if your mailbox was connected before this existed.
- **Calendar & meetings** — whether Ask Vesta can read your calendar and
  schedule meetings (see the [Ask Vesta guide](ask-vesta.md)). If it says
  **Reconnect to enable**, click "Reconnect Outlook" once and approve the
  calendar permission — that's all.

## "What Vesta watches" — your filter mode

This setting controls **Gate 1** of filtering (real mail vs. noise):

- **Focused** (default) — show real correspondence, hide automated/bulk noise.
- **Flagged** — show only mail you flagged in Outlook.
- **Everything** — show all mail, no noise filtering.

Changing the mode **re-evaluates your already-synced mail instantly**, so you see the
effect right away. Full details in
[How Vesta filters your email](email-filtering.md).

From here you can also **Review hidden mail** and see your **managed senders** (the
allow/mute rules you've created), removing any you no longer want.

## Your timezone

Under **Preferences → Timezone**. Everything time-based follows this clock: task
due times ("tomorrow" means *your* tomorrow morning), AI deadline dates, the
Weekly Review's day-by-day bars, when your daily brief refreshes, and the dates
the AI sees when writing replies.

- **Automatic (default):** Vesta follows your device — sign in from anywhere
  and it adjusts on its own. You don't have to do anything.
- **Pin a timezone:** pick one from the list and it stays fixed no matter which
  device you use, until you switch back to Automatic.

The card always shows which timezone is currently in effect.

## Scheduled reminders

Under **Scheduled reminders** you'll find every email reminder you created
through Ask Vesta (e.g. *"email me about this thread at 3pm, hourly, 3
times"*). Each row shows what it's about, who receives it, the schedule, and
the **next send time** — with a **Cancel** button that stops the series
instantly (emails already sent stay sent). A reminder is never an invisible
background process: if it's running, it's listed here.

## Light & dark mode

Vesta fully supports both **light** and **dark** themes on every screen. **Dark is
the default.**

- Toggle the theme from the top bar.
- Your choice is **remembered** across sign-out, sign-in, and reloads — Vesta won't
  reset it on you.
- The theme is applied before the page paints, so you won't get a bright flash when
  loading in dark mode (or vice versa).

## Related

- [Connecting Outlook](connect-outlook.md)
- [How email stays in sync](email-sync.md)
- [How Vesta filters your email](email-filtering.md)
