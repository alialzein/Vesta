# Draft replies

Vesta can **write a reply for you** to any email that's waiting on you — in your
tone, ready to review. You stay in control the whole way: you read it, edit it, and
**approve it** before anything is sent. Vesta never sends an email on its own.

## How it works, in four steps

1. **Open the composer.** On the dashboard, select a work item, then click
   **Draft reply** (in the AI Assistant rail's **Action** or **Draft** tab). On a
   **Waiting on them** item the button says **Draft follow-up** instead — same
   composer, different job. The composer slides in from the right.
2. **Vesta writes a draft.** It reads the recent conversation — both their messages
   **and your own replies** — and writes in your voice. You'll see it appear in a
   few seconds. It knows which side of the conversation you're on:
   - For an item **waiting on you**, it writes a **reply** that answers them.
   - For a **Waiting on them** item (you already answered and they owe you an
     update), it writes a short, polite **follow-up nudge** asking for what they
     owe — it won't pretend you still owe them a response.
3. **Review & edit.** Change anything you like — the wording, the subject, who it
   goes to. Not happy with the whole thing? Pick a different **tone** or type a quick
   instruction ("politely decline", "ask for the deck") and hit **Regenerate**.
4. **Approve & Send.** When it's right, click **Approve & Send**. Vesta sends it as a
   proper reply in the original Outlook conversation (with the quoted history), and
   the item drops off your radar. (One exception: sending a **follow-up nudge** on a
   *Waiting on them* item keeps it on the radar — they still owe you the answer, and
   Vesta keeps tracking it until they reply.)

## What you can change

- **Reply** — the body text. Edit freely; your edits are kept.
- **Subject** — pre-filled with the thread's "RE: …" subject.
- **To / Cc / Bcc** — every recipient shows as a chip with its **real email
  address**, so you can see exactly who the reply reaches. Click the **✕** on any
  chip to remove someone, or type an address (and press Enter) to add one — including
  **Bcc**, which a reply never inherits. The reply is sent to exactly the list you see.
- **Reply all** — by default the reply goes to the person who wrote to you; tick
  **Reply to everyone on the thread** to fill To/Cc with everyone on it (then trim as
  you like).
- **Tone** — Professional, Warm, Concise, Formal, or Friendly. Vesta also follows
  your [Memory & Rules](memory-and-rules.md): tone and preference memories shape
  the writing, **"Do NOT do" rules are hard limits the draft will not cross**, and
  saved project/company context is used instead of guessing.
- **Tell Vesta how to reply** — an optional one-line instruction that steers the
  draft when you regenerate. If you send a draft you steered this way, Vesta may
  **suggest** saving that instruction as a preference for that person — the
  suggestion waits in Memory & Rules until you approve or reject it.

## Vesta keeps you safe

- **Nothing sends without your approval.** There is no auto-send. Every reply waits
  for your explicit **Approve & Send** click.
- **Careful-review flags.** If a thread touches a sensitive topic — legal, a
  contract, money, HR, security, and the like — Vesta adds a **"Check before
  sending"** caution and asks you to review the wording carefully.
- **It won't make things up.** If the email is missing something it needs, the draft
  asks a short question or writes a safe holding reply rather than inventing facts,
  numbers, or commitments.
- **Every send is logged.** Sent replies are recorded for your audit history.

## Saving without sending

- **Save** keeps your draft so you can come back to it later — you'll see
  **"Draft ready"** on the item, and re-opening the composer brings back your text.
- **Discard** throws the draft away.

## All your drafts in one place

Left sidebar → **Draft Replies** opens the list of every saved draft that hasn't
been sent yet. The badge on the sidebar shows how many are waiting.

- Each row shows the subject, who it goes to, a preview of the text, when it was
  last touched, and its state — **AI draft** (Vesta wrote it, untouched),
  **Edited by you**, or **Send failed — retry**.
- **Click a row** and you land back on the dashboard with that item selected and
  the composer already open — exactly where you left off. Review → **Approve &
  Send**.
- If the item a draft belongs to has since been closed, the draft is kept and the
  row says so — nothing is deleted behind your back.

## Turning sending on

Sending needs your permission to send mail on your behalf (the Microsoft
**Mail.Send** permission). If you connected Outlook before this feature existed,
you'll see **"Reconnect to enable sending"** in the composer and in
**Settings → Outlook**. Reconnect once to grant it — nothing else about your
connection changes. (If your workspace is set to *draft-only* mode, **Approve & Send**
instead saves the reply to your **Outlook Drafts**, and you send it from there.)

## If something goes wrong

- **"Reconnect Outlook to enable sending"** — grant the send permission (above).
- **"Send failed"** — your draft is kept; fix the issue and try again.
- **No reply to write** — the item is a task or note you added, not an email thread,
  so there's nothing to answer.

## Related

- [How Vesta's AI reads your email](ai-analysis.md)
- [Your dashboard & Priorities](priorities-and-dashboard.md)
- [Connecting Outlook](connect-outlook.md)
