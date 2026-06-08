# How Vesta's AI reads your email

After Vesta syncs your mailbox, its AI reads the threads that are **waiting on you**
and turns each one into clear, actionable guidance on your dashboard. This is what
fills the **AI Assistant rail**.

## What the AI produces for each item

- **Summary** — 1–2 plain sentences: what the thread is about and what's needed.
- **Priority** — a refined 0–100 score (it improves on the rule-based starting score).
- **Deadline** — a due date when the email states or clearly implies one.
- **Next Best Action** — one concrete step ("Approve the Q3 budget so vendor
  contracts proceed").
- **Why this matters** — one sentence of *user-visible* reasoning.

> **No hidden reasoning.** Vesta only ever shows you reasoning you can read — it
> never keeps secret "chain-of-thought." If you don't agree with a call, the reason
> is right there to judge it by.

## What it reads (and what it doesn't)

To stay fast and cheap, the AI is sent only what it needs: the **latest message**
(formatting stripped, quoted reply-chains removed, and length-capped) plus a few
**facts about the thread** Vesta already tracks (who's waiting, how many follow-ups,
how many messages). It does **not** re-read your entire mailbox or whole long
histories every time — so a 20-message thread costs about the same as a short one.

## When it runs

Automatically, **after each sync**. To keep it efficient and low-cost:

- Only **waiting-on-you** items are analyzed.
- Each item is analyzed **once per change** — if nothing new arrived on a thread, it
  isn't re-analyzed.
- Daily and per-sync **caps** bound how much is analyzed, so cost stays predictable.

## Cost & privacy

- It's **cheap** — a typical email is a few hundred tokens (pennies per month for a
  normal mailbox). Every analysis records its exact tokens and cost.
- The email content is sent to the configured **AI provider** for analysis only.
  Which provider/model is used is a setting (today: OpenAI), changeable later without
  a code change.

## What's not here yet

The AI **analyzes** today; it does **not write replies** yet. Suggested draft
replies — and sending them, always with your approval — arrive in a later phase. The
"Approve Draft" button tells you so when clicked.

## Related

- [Your dashboard & Priorities](priorities-and-dashboard.md)
- [How Vesta filters your email](email-filtering.md)
