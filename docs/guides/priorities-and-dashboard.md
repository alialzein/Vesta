# Your dashboard & Priorities

Vesta's home screen is built around one idea: **show the manager the few things that
need them, ranked, and get out of the way.** This guide explains what you see and
how items get there.

## Today's Radar (the dashboard)

Your **Today** dashboard leads with **Today's Radar** — a focused list of the items
waiting on you, highest priority first. Above it sits a short **Morning Brief**
summarizing how many things are waiting and what the top one is, plus a compact strip
of metrics (waiting on you, high priority, follow-ups, open items, FYI, top score).

You can filter the Radar by type using the chips at the top (All, Decisions,
Blockers, Follow-ups, Promises, Can delegate, Drafts).

> What's on the Radar is **real data from your mailbox**, not a demo. If nothing is
> waiting on you, you'll see an honest "You're all clear" state — not filler.

### What each Radar card shows

- **Who it's from** — the real sender of the latest message (their name, or a
  readable version of their email address), with a small colored **initials
  avatar** so the same person is recognizable at a glance. The AI rail shows the
  full email address under **From**.
- **Overdue in red** — if an item's deadline has passed, the card says **Overdue**
  in red (with the original date), instead of a quiet "Due Jun 9" you could miss.
- Title, a one-line summary of the newest message, category chips, the priority
  score, and the suggested action (highlighted on the card you've selected).

## Priorities ("Waiting on Me")

The **Priorities** view (sidebar: *Waiting on Me*) is the full, ranked list of every
conversation waiting on your reply. Each item shows its category, a priority band, and
a plain-language **reason** it's there (e.g. *"Maya is waiting on your reply"*).

## Reading the full email behind an item

A dashboard item or Priorities row is a summary. To read the actual email(s), open
the **full thread**: select an item and use **Open full thread** in the AI rail, or
click a **Priorities** row. That opens the full-screen conversation view (every
message, complete bodies, your replies marked **You**) — see
[Inbox & Hidden mail](inbox-and-hidden.md#opening-a-full-email--thread).

## Adding your own tasks (quick add)

Not everything starts as an email. Above the Radar there's an **Add a task** box —
type a plain line and press **Add task**:

> *"Call the vendor tomorrow 3pm"* → a task titled **Call the vendor**, due **tomorrow
> at 3:00 PM**.

Vesta reads the due date out of your words (no AI needed) — it understands **today**,
**tomorrow** (typos like *tommorw* too), **tonight**, **next week**, weekday names
(**Friday**), **in 3 days**, and clock times (**3pm**, **9:30am**, **15:00**). A date
with no time defaults to 9 AM. If it can't find a date, it saves the task with no due
date. Tasks appear on the Radar under the **Tasks** filter and support the same
**Done / Snooze** actions as email items.

**The ✨ AI button** (next to *Add task*) does more with messier notes: it reads your
line with AI and figures out the **kind** (task, reminder, call, or meeting), the
**person**, and the **time** — so "set up a 30-min call with Toufik next Tuesday
afternoon" lands correctly. Plain "Add task" stays free/instant; ✨ uses one AI call,
so it's there when you want the extra smarts.

## Acting on an item — Done, Dismiss, Snooze

Select an item to open the **AI rail** on the right. Under *Why this matters* you'll
find three ways to clear it off your Radar:

- **Mark done** — you've handled it. It leaves the Radar and is recorded as
  completed (for your Weekly Review later).
- **Dismiss** — it didn't need you (e.g. an FYI or a closed-ticket notice). It leaves
  the Radar.
- **Snooze** — hide it until later. Pick **Later today**, **Tomorrow**, or **Next
  week**, and it returns to the Radar on its own when the time comes.

**Done and Dismiss both come back if the sender replies again** on that thread — new
activity on a thread you closed needs you again, so you won't miss a genuine
follow-up. The difference is only intent: *Done* = "I handled it" (counts toward what
you got done); *Dismiss* = "this didn't need me". To stop hearing from a sender
entirely, **mute** them in Settings instead.

These update instantly. If something was a mistake, the action shows a confirmation
and the item simply reappears on the next sync if it still needs you.

## "Waiting on them" — when you're owed a reply

Normally an item leaves the Radar the moment you reply. But if **your reply asked for
something** — "Can you send me the figures?", "Please confirm by Friday" — you're now
waiting on *them*, and Vesta keeps it as a **Waiting on them** item (its own filter
chip on the Radar) so it doesn't silently disappear. The longer they go without
replying, the higher it climbs. When they finally reply, it flips back to **Waiting on
you**.

Vesta only does this for replies that actually expect a response — a quick "thanks" or
"will do" won't create one. (How aggressively it uses AI to judge this is a setting
we can tune per account.)

## The "Unread" marker

If the newest message in a thread is still **unread** in Outlook, its Radar card shows
a small blue **Unread** dot — so you can tell at a glance what you haven't actually
opened yet, separate from what you've read but not yet answered.

## How an item earns a spot

Only mail that needs **you** becomes a dashboard/Priorities item. This is the second
filtering gate — a conversation qualifies when **both** are true:

1. **The ball is in your court** — the latest message is incoming and you haven't
   replied yet.
2. **You're actually addressed** — you're a direct recipient (or named in the
   message), not just Cc'd on a broadcast.

(See [How Vesta filters your email](email-filtering.md) for the full picture.)

## How items are ranked

Each item gets a **priority score (0–100)** from a transparent set of signals:

- **Waiting on you** carries a base weight (it's actionable).
- **How recent** the latest message is.
- **Follow-up pressure** — how many times they've chased you raises the score.
- **VIP** — mail from people you marked VIP ranks higher.

Items are then grouped into categories like **Waiting on you**, **Follow-up**, and
**FYI**. Scores 85+ are the red band and are tagged **High priority** — the same
threshold everywhere (the score badge color, the card chip, the High Priority
metric, and the rail's band label), so the words never contradict the colors.

> **AI then refines it.** After a sync, Vesta's AI reads each waiting thread and
> rewrites the summary, refines the priority, detects a deadline, and produces the
> **Next Best Action** and **Why this matters** you see in the AI rail — with reasons
> you can read (never hidden reasoning). The rule-based score above is the starting
> point AI improves on. See [How Vesta's AI reads your email](ai-analysis.md).

## Related

- [How Vesta's AI reads your email](ai-analysis.md)
- [How Vesta filters your email](email-filtering.md)
- [Inbox & Hidden mail](inbox-and-hidden.md)
