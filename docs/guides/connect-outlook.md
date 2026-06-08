# Connecting Outlook

For Vesta to help with your email, it needs permission to **read** your Outlook
mailbox. This is a separate, deliberate step from signing in — so you're always in
control of when Vesta gets mailbox access.

## How to connect

1. Open **Settings** (the gear icon in the top bar).
2. Find the **Outlook** card.
3. Click **Connect** and sign in to Microsoft when prompted, approving the access
   request.
4. You'll return to Settings, and the card will show **Connected**.

That's it — Vesta will begin syncing your recent mail. See
[How email stays in sync](email-sync.md) for what happens next.

## What Vesta can and can't do

- **Reads** your mail (Inbox and Sent) to understand what's waiting on you.
- **Never sends anything on your behalf without your explicit approval.** Vesta is
  read-only until you approve a specific action.
- Your connection **stays alive automatically** — Vesta refreshes its access in the
  background so you don't have to reconnect every day.

## Managing the connection

From the same Outlook card in Settings you can:

- **Test connection** — confirm Vesta can still reach your mailbox.
- **Disconnect** — revoke access at any time. Vesta stops syncing immediately.

## Security

Your mailbox access tokens are **encrypted** and stored privately. Vesta connects
through Microsoft's official, secure sign-in flow (Microsoft Graph) — it never sees
or stores your Microsoft password.

## Related

- [How email stays in sync](email-sync.md)
- [How Vesta filters your email](email-filtering.md)
- [Settings & appearance](settings-and-themes.md)
