# Vesta — User Guides

Plain-language guides that explain how Vesta works **from the manager's point of
view**. No code, no jargon — just what each feature does, what you'll see, and how
to control it.

These are written so they can later be stitched together into one complete user
manual. Each guide is self-contained and matches the product as it actually ships.

> **Published for users at `/user-guide`.** These Markdown files are the *source* —
> they render live as the public, themed doc site
> ([vesta-ai-radar.vercel.app/user-guide](https://vesta-ai-radar.vercel.app/user-guide)),
> built statically at deploy time. To add a guide to the site: drop its `.md` here
> and add one row to [`lib/guides/registry.ts`](../../lib/guides/registry.ts) (slug,
> title, group, blurb, icon). The operator-only `admin-panel.md` is deliberately
> **not** in the registry, so it never reaches the public site.

> **Working rule:** every time we finish a feature, we add or update its guide here
> in the same task. If a guide and the app ever disagree, the app is right and the
> guide is out of date — fix it.

## Guides

| Guide | What it covers |
|-------|----------------|
| [Getting started](getting-started.md) | The animated welcome page, creating your account, and signing in (email or Microsoft/Google) |
| [First-run setup](onboarding.md) | The short welcome wizard that teaches Vesta about you |
| [Connecting Outlook](connect-outlook.md) | Linking your mailbox so Vesta can read your email |
| [How email stays in sync](email-sync.md) | How Vesta keeps up with new and deleted mail automatically |
| [How Vesta filters your email](email-filtering.md) | **The two gates** — what's hidden, what's in your Inbox, what reaches your dashboard |
| [Inbox & Hidden mail](inbox-and-hidden.md) | Reading synced mail and reviewing what Vesta filtered out |
| [Your dashboard & Priorities](priorities-and-dashboard.md) | Today's Radar, "Waiting on you", overdue & senders, quick actions, and how items are ranked |
| [How Vesta's AI reads your email](ai-analysis.md) | What the AI produces (summary, priority, deadline, next action), what it reads, cost & privacy |
| [Draft replies](draft-replies.md) | Let Vesta write a reply — or a follow-up nudge — edit it, and approve & send; nothing sends without you |
| [Memory & Rules](memory-and-rules.md) | Teach Vesta VIPs, tone, delegation, and hard limits — used in every ranking and draft; suggestions wait for your approval |
| [Ask Vesta](ask-vesta.md) | Your second brain — chat that answers from your inbox, memory, briefing, and calendar, learns you with every conversation, and takes orders (tasks, snoozes, reminder emails, meetings) behind a Confirm tap |
| [Meetings](meetings.md) | Your Outlook calendar in Vesta — week grid with a live now-line, month view, agenda — Join links and **Prep with Vesta**: a one-page brief from the attendees' email history |
| [Daily Brief & Focus Mode](daily-brief-and-focus.md) | The AI-written morning brief about your own queue, the "Start here" pick, and the full-screen Clear-My-Day pass |
| [Briefing](briefing.md) | Your daily intelligence — news picked for your topics, clients, and competitors, with why-it-matters and suggested actions |
| [Weekly Review](weekly-review.md) | Your week at a glance — what you finished, replies sent, noise dismissed, and who took your attention |
| [Vesta on your phone](vesta-on-your-phone.md) | Install Vesta on your home screen like an app — bottom tab bar, dense list rows, and the tap-to-act sheet |
| [Settings & appearance](settings-and-themes.md) | Managing your mailbox connection, filter mode, and light/dark theme |
| [Admin panel (operator)](admin-panel.md) | ⚙️ **Operator-only** — the `/admin` console: users, mailboxes/sync, email retention, and AI cost control |

## How the pieces fit together

```
Sign in ─▶ First-run setup ─▶ Connect Outlook ─▶ Vesta syncs your mail
                                                        │
                                          ┌─────────────┴─────────────┐
                                          ▼                           ▼
                                   Gate 1: Triage             (kept in sync as
                                "real mail vs noise"           mail arrives or
                                          │                    is deleted)
                            ┌─────────────┴─────────────┐
                            ▼                           ▼
                       Inbox tab                   Hidden tab
                  (real correspondence)         (filtered noise)
                            │
                            ▼
                   Gate 2: Waiting?  ── only mail that needs YOUR reply
                            │
                            ▼
              Dashboard (Today's Radar) + Priorities
```

See [How Vesta filters your email](email-filtering.md) for the full explanation of
the two gates.
