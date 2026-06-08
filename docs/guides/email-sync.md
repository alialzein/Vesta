# How email stays in sync

Once your mailbox is connected, Vesta keeps its copy of your email current **on its
own** — you don't have to press a button. This guide explains how that works and
what to expect.

## You don't have to click "Sync"

Vesta refreshes your mail automatically in two ways:

- **In the background, on a schedule** — even with no browser open, Vesta checks for
  new mail regularly on the server. (Phones and other devices benefit from this too.)
- **In real time** — when your mailbox tells Vesta something changed, Vesta picks it
  up promptly rather than waiting for the next scheduled check.
- **While you're using the app** — opening the Dashboard, Inbox, or Priorities
  triggers a quick refresh if your data looks stale.

There's still a manual **"Sync now"** button in **Settings → Outlook** if you ever
want to force an immediate refresh.

## Only what changed

Vesta is efficient: after the first sync it pulls **only what's new or changed**,
not your whole mailbox every time. A large first-time sync is resumed
piece-by-piece across refreshes so it never stalls.

## When you delete an email

**Deleting mail in Outlook removes it from Vesta too.** On the next sync, Vesta
notices the message was removed and drops it from your Inbox, Hidden list,
conversations, and dashboard items. You don't have to clean up Vesta separately.

> Behind the scenes Vesta marks the message as deleted rather than scrubbing every
> trace immediately, but from your point of view it's gone from every view.

## What about old mail piling up?

Vesta keeps a copy of synced mail so it can show conversation history and let you
review filtered (Hidden) mail. Today there's **no automatic clean-up of very old
mail** — it simply accumulates.

> **Planned improvement:** an automatic retention policy (for example, dropping mail
> older than a chosen age, and permanently clearing already-deleted messages after a
> grace period) so storage stays lean over time. Until then, a maintenance tool
> exists to wipe synced mail and re-sync cleanly if ever needed.

## Related

- [How Vesta filters your email](email-filtering.md)
- [Inbox & Hidden mail](inbox-and-hidden.md)
- [Connecting Outlook](connect-outlook.md)
