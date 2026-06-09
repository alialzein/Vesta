# Vesta — User Guides

Plain-language guides that explain how Vesta works **from the manager's point of
view**. No code, no jargon — just what each feature does, what you'll see, and how
to control it.

These are written so they can later be stitched together into one complete user
manual. Each guide is self-contained and matches the product as it actually ships.

> **Working rule:** every time we finish a feature, we add or update its guide here
> in the same task. If a guide and the app ever disagree, the app is right and the
> guide is out of date — fix it.

## Guides

| Guide | What it covers |
|-------|----------------|
| [Getting started](getting-started.md) | Creating your account and signing in (email or Microsoft/Google) |
| [First-run setup](onboarding.md) | The short welcome wizard that teaches Vesta about you |
| [Connecting Outlook](connect-outlook.md) | Linking your mailbox so Vesta can read your email |
| [How email stays in sync](email-sync.md) | How Vesta keeps up with new and deleted mail automatically |
| [How Vesta filters your email](email-filtering.md) | **The two gates** — what's hidden, what's in your Inbox, what reaches your dashboard |
| [Inbox & Hidden mail](inbox-and-hidden.md) | Reading synced mail and reviewing what Vesta filtered out |
| [Your dashboard & Priorities](priorities-and-dashboard.md) | Today's Radar, "Waiting on you", and how items are ranked |
| [How Vesta's AI reads your email](ai-analysis.md) | What the AI produces (summary, priority, deadline, next action), what it reads, cost & privacy |
| [Draft replies](draft-replies.md) | Let Vesta write a reply, edit it, and approve & send — nothing sends without you |
| [Settings & appearance](settings-and-themes.md) | Managing your mailbox connection, filter mode, and light/dark theme |

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
