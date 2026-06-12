# How Vesta's AI reads your email

After Vesta syncs your mailbox, its AI reads the threads that are **waiting on you**
and turns each one into clear, actionable guidance on your dashboard. This is what
fills the **AI Assistant rail**.

## What the AI produces for each item

- **Summary** — 1–2 plain sentences: what the thread is about and what's needed.
- **Priority** — a refined 0–100 score (it improves on the rule-based starting score).
- **Deadline** — a due date when the email states or clearly implies one. If the
  email names a specific time ("meet at 3:00 PM"), the deadline keeps that time —
  so a 3 PM meeting isn't marked Overdue at 10 in the morning; date-only deadlines
  default to 9:00 AM your time. Overdue items show the missed moment ("was due
  Jun 12, 3:00 PM").
- **Next Best Action** — one concrete step ("Approve the Q3 budget so vendor
  contracts proceed").
- **Why this matters** — one sentence of *user-visible* reasoning.

> **No hidden reasoning.** Vesta only ever shows you reasoning you can read — it
> never keeps secret "chain-of-thought." If you don't agree with a call, the reason
> is right there to judge it by.

## What it reads (and what it doesn't)

To stay fast and cheap, the AI is sent only what it needs: the **latest message**
(formatting stripped, quoted reply-chains removed, and length-capped), a compact
recap of the **recent conversation** — the last few messages in *both* directions,
including your own replies, each trimmed short — plus **today's date** (so
"tomorrow" or "by Friday" resolve to real deadlines) and a few **facts about the
thread** Vesta already tracks (who's waiting, how many follow-ups, how many
messages). It does **not** re-read your entire mailbox or whole long histories
every time — so a 20-message thread costs about the same as a short one.

It also reads **your Memory & Rules**: VIPs, delegation rules, hard limits, and
saved project/company context (a short, capped list — memories pinned to a person
only ride along on that person's threads). That's how a VIP sender ranks higher,
a matching delegation rule turns into a "hand this to…" suggestion, and the AI's
explanations reflect what you've taught it. See
[Memory & Rules](memory-and-rules.md).

## When it runs

Automatically, **after each sync**. To keep it efficient and low-cost:

- Only **waiting-on-you** items are analyzed (plus a quick **reply-intent** check on
  "Waiting on them" items — see below).
- Each item is analyzed **once per change** — if nothing new arrived on a thread, it
  isn't re-analyzed.
- Daily and per-sync **caps** bound how much is analyzed, so cost stays predictable.

### "Waiting on them" reply-intent

When you reply to a thread, Vesta decides whether your reply actually **expects a
response** (so it becomes a *Waiting on them* item) or just closes the loop. A free
heuristic skips the obvious "thanks/done" replies; only the plausible asks cost an AI
call, which confirms and writes the follow-up note (or drops it if nothing's owed). How
aggressively AI is used here is a per-account setting (`pregate_ai` default,
`ai_always`, `heuristic`, or `off`).

## Cost & privacy

- It's **cheap** — a typical email is a few hundred tokens (pennies per month for a
  normal mailbox). Every analysis records its exact tokens and cost.
- The email content is sent to the configured **AI provider** for analysis only.
  Which provider/model is used is a setting (today: OpenAI), changeable later without
  a code change.

## Writing replies

The AI also **writes draft replies** for you — open the **Draft** tab (or the
**Draft reply** button) on any waiting item and Vesta drafts a response in your tone.
On a **Waiting on them** item the same button says **Draft follow-up** and writes a
polite nudge for what they owe you instead. It reads the recent conversation in both
directions — including your own replies — so it always knows which side owes what.
You review, edit, and **approve** it; nothing sends without you. See
[Draft replies](draft-replies.md).

## Related

- [Your dashboard & Priorities](priorities-and-dashboard.md)
- [Draft replies](draft-replies.md)
- [How Vesta filters your email](email-filtering.md)
