# How Vesta filters your email

Your mailbox is noisy — newsletters, alerts, automated notifications, broadcasts
you're only copied on. Vesta's job is to surface the handful of emails that
genuinely need **you**, without you losing access to everything else.

To do that, every email Vesta syncs passes through **two independent gates**. They
answer two different questions, and it's important not to confuse them:

| | Question it answers | What it decides |
|--|---------------------|-----------------|
| **Gate 1 — Triage** | *Is this real mail or noise?* | Whether it shows in your **Inbox** or your **Hidden** list |
| **Gate 2 — Waiting?** | *Does this need me to reply?* | Whether it becomes a card on your **Dashboard** and **Priorities** |

> **Key idea:** Vesta keeps a copy of **all** your mail. Filtering never deletes
> anything — it just decides *where* a message appears. Anything filtered out is
> still there for you to review and recover.

---

## Gate 1 — Triage: real mail vs. noise

This gate sorts every incoming message into either your **Inbox** (real
correspondence) or your **Hidden** list (noise you can review later).

How aggressively it filters depends on the **mode** you choose in
**Settings → Outlook → "What Vesta watches"**:

### Focused mode (the default — recommended)
Vesta shows real correspondence and hides obvious noise. A message is **hidden**
when it looks automated or bulk, specifically:

- **No-reply / automated senders** — addresses like `noreply@`, `notifications@`,
  `alerts@`, `newsletter@`, `marketing@`, `updates@`, `bounce@`, `system@`, etc.
- **Newsletter / marketing senders** — campaign addresses like `news.brand.com`,
  `mail.brand.com`, `email.brand.com`.
- **Bulk email signals** — messages carrying "unsubscribe", "bulk", or
  bounce/auto-reply markers in their technical headers.
- **Outlook's "Other" pile** — anything Microsoft's own Focused Inbox sorted into
  *Other* rather than *Focused*.

A few things **override** hiding, so important mail still gets through:

- **You flagged it** in Outlook → always shown.
- **Marked high importance** → rescues mail that only landed in *Other*
  (but a clear no-reply/newsletter sender stays hidden — machines can fake
  "importance").

### Flagged mode
Vesta shows **only** the mail you've flagged in Outlook. Everything else goes to
Hidden. Use this when you want an extremely quiet view.

### Everything mode
Vesta shows **all** your mail — no noise filtering at all. Use this if you'd rather
filter manually.

### Your own rules always win
Across every mode, two manager-controlled lists override the automatic logic:

- **Allow / VIP** — a sender, domain, or person you've marked **VIP** or **Always
  allow** is *always* shown, even if it looks automated.
- **Mute** — a sender, domain, or subject you've **muted** is *always* hidden, even
  if it looks like real mail.

You set these with one click from the Inbox ("Mute" / "Mark VIP") or the Hidden
list ("Always allow" / "Mark VIP"). See [Inbox & Hidden mail](inbox-and-hidden.md).

The order Vesta checks: **Allow/VIP → Mute → mode rules**. The first match wins, and
every decision comes with a short reason (e.g. *"Newsletter / bulk sender"*) shown
on the Hidden list so you always know *why*.

---

## Gate 2 — Waiting?: what reaches your dashboard

Passing Gate 1 gets a message into your **Inbox**. It does **not** automatically put
it on your dashboard. Your **Dashboard (Today's Radar)** and **Priorities** view are
deliberately narrower — they show only the mail that is **waiting on you**.

A conversation becomes a dashboard item only when **both** are true:

1. **The ball is in your court** — the most recent message in the thread is
   incoming (you haven't replied yet).
2. **It's actually addressed to you** — you're a direct *To* recipient, or your
   name/address appears in the message. If you're only **Cc'd** on a broadcast,
   Vesta will **not** nag you about it.

This is why the same email can appear in your Inbox but not on your dashboard — for
example, a thread where **you already sent the last reply** is in your Inbox, but
nothing is waiting on you, so it's not a dashboard card.

---

## Putting it together: where will an email show up?

| The email is… | Inbox tab | Hidden tab | Dashboard / Priorities |
|----------------|:--------:|:----------:|:----------------------:|
| A colleague emailing you directly, awaiting your reply | ✅ | — | ✅ |
| A thread where you already replied last | ✅ | — | — |
| A broadcast you're only Cc'd on | ✅ | — | — (you're not addressed) |
| A newsletter / `noreply@` alert | — | ✅ | — |
| A muted sender | — | ✅ | — |
| A VIP / allow-listed sender | ✅ | — | ✅ if it's waiting on you |

---

## Are these filters right for us?

The focused-mode heuristics are a solid first version, but there are **two cases
where a genuinely important email could be hidden** — worth knowing:

1. **Microsoft's "Other" isn't perfect.** A first-time human contact can occasionally
   be sorted into *Other* and hidden. It still lands in your **Hidden** list (never
   lost), and it's rescued if the sender marked it high importance — but if you never
   check Hidden, you could miss it.
2. **A real person with a "bulk-looking" address.** Someone like
   `marketing@aclient.com` who is actually a human account manager gets hidden
   because of the `marketing` keyword. One click of **Always allow** fixes it
   permanently.

**Practical advice for now:** glance at the **Hidden** list every few days until
you trust the filtering, and **Always allow / Mark VIP** the people who matter. It's
always one click away from the **Hidden** item in the sidebar. Over time your rules
make the filtering personal and accurate. Smarter, AI-assisted filtering (so
borderline mail is double-checked before being hidden) is planned for a later phase.

---

## Related

- [Inbox & Hidden mail](inbox-and-hidden.md) — reading and overriding
- [Your dashboard & Priorities](priorities-and-dashboard.md) — how items are ranked
- [How email stays in sync](email-sync.md) — including what happens when you delete mail
