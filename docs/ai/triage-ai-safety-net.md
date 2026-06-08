# AI triage safety-net — catching important mail without burning tokens

> **Status: planning (Phase 7).** Design note for using AI to reduce the chance that
> a genuinely important email gets hidden — while keeping AI cost bounded and
> predictable.

## The problem

Today's filtering (focused mode) is rule-based. Two cases can wrongly hide real mail:

1. Microsoft sorts a real first-time human contact into **"Other"** → we hide it.
2. A real person with a **bulk-looking address** (`marketing@`, `news@`, …) → we
   hide it on a keyword.

The current safety net is the **Hidden list**, but it's buried, so a busy manager
may never look. We want AI to act as a second opinion — **but we cannot afford to
run AI over every email**; that scales badly and gets expensive.

## Principle: only spend AI on the *ambiguous* slice

The key insight is that **most mail is decided cheaply and confidently** — no AI
needed. AI should only judge the narrow gray zone where the rules are unsure.

Split every message into three buckets with the existing free heuristics:

| Bucket | Examples | AI? |
|--------|----------|-----|
| **Confident keep** | Focused inbox, VIP, allow-listed, flagged, addressed-to-you reply | ❌ no — keep |
| **Confident noise** | `noreply@`, `List-Unsubscribe` header, bulk subdomain, bounce | ❌ no — hide |
| **Gray zone** | In Outlook "Other", *no* strong automated signal, unknown human-looking sender | ✅ **AI second opinion** |

Only the **gray zone** reaches AI. In a normal mailbox that's a small fraction of
incoming mail.

## Cost controls stacked on top

Even within the gray zone, keep spend bounded:

1. **Decide per *sender*, not per *email*.** The first time an unknown gray-zone
   sender appears, AI judges "is this a real person trying to reach the manager, or
   automated/bulk?" **Cache the verdict on the sender** (a rule or a flag on the
   `people` row). Every future email from that sender skips AI. Cost ≈ number of
   *new unknown senders* in the gray zone, not number of emails.
2. **Batch** multiple gray-zone senders into a single AI request.
3. **Cheapest capable model** — this is a short binary classification, ideal for a
   small/fast model (e.g. Haiku), not a flagship.
4. **Metadata only** — send sender, subject, short preview; never whole bodies. Tiny
   prompts = tiny cost.
5. **Daily token/cost budget** (from the admin panel). If the budget is hit, fall
   back to the pure heuristic (hide → Hidden) and lean on the visible nudge. AI
   filtering degrades gracefully; it never blocks sync.
6. **Log every call** to the `ai_usage` ledger so we can see exactly what triage AI
   costs and tune the budget.

## Net effect

- Real human contacts in "Other" get rescued before they're hidden.
- A `marketing@realcompany.com` account manager is recognized as a person, once.
- Cost is roughly "a handful of new ambiguous senders per day, judged once each" —
  not "every email, every sync."

## Defense in depth (do these regardless of AI)

AI is one layer. Pair it with cheaper safeguards so nothing relies on AI alone:

- **Make Hidden visible** — surface a "N filtered recently → review" nudge on the
  dashboard so the manager can self-correct (see the dashboard nudge work).
- **Learn from overrides** — every *Always allow* / *Mark VIP* / *Mute* teaches the
  rules, so the gray zone shrinks over time per user.

## Open questions (decide when building Phase 7)

- Run the AI check **inline during sync** (slightly slower sync) vs **as a
  background pass** over freshly-hidden mail (eventually-consistent)?
- Default daily budget per user?
- Do we auto-promote an AI-judged human to a soft allow-rule, or just un-hide that
  one message and wait for the manager's explicit override?

## Related

- `docs/guides/email-filtering.md` — the shipped rule-based filtering
- `docs/product/admin-panel-plan.md` — AI usage ledger + budgets that gate this
- `docs/implementation/phases.md` — Phase 7 (AI Analysis)
