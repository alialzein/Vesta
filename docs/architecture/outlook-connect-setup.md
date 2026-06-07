# Connect Outlook — Azure App Setup (Phase 3)

"Connect Outlook" uses Microsoft Graph OAuth (authorization-code flow). You
create **ONE** Azure app registration for all of Vesta — it is **not** per user.
Each user who connects gets their own encrypted token pair (auto-refreshed).

> Identity vs mailbox: this is the **mailbox** connection (reads email). It is
> separate from login SSO (Phase 2b, configured in Supabase). One Azure app can
> serve both, or you can keep them separate.

## What the code already does

- `GET /api/outlook/connect` → redirects the user to Microsoft (CSRF state cookie).
- `GET /api/outlook/callback` → exchanges the code, reads `/me`, saves the
  `user_integrations` + `mailboxes` rows, and stores **encrypted** tokens in
  `private.graph_tokens` (via service-role SECURITY DEFINER RPCs).
- Tokens auto-refresh (`offline_access` refresh token) so the mailbox stays
  connected. Settings → Outlook card shows status + Test + Disconnect.
- Until the env keys are set, the Connect button shows "not configured" and
  nothing breaks.

## 1. Register the app (once)

Azure Portal → **Microsoft Entra ID → App registrations → New registration**:

- **Name:** Vesta
- **Supported account types:** _Accounts in any organizational directory and
  personal Microsoft accounts_ (multi-tenant + personal) — so any user can connect.
- **Redirect URI (Web):** `http://localhost:3000/api/outlook/callback`
  (add your production URL too later, e.g. `https://<domain>/api/outlook/callback`).
- Register → copy the **Application (client) ID**.

## 2. Client secret

**Certificates & secrets → New client secret** → copy the **Value** (shown once).

## 3. API permissions (delegated)

**API permissions → Add → Microsoft Graph → Delegated permissions**, add:

```txt
offline_access   (refresh token → stay connected)
User.Read        (identity / mailbox address)
Mail.Read        (read mail — the MVP)
```

(`openid`, `profile`, `email` are included by default.) Click **Grant admin
consent** if your tenant requires it; otherwise each user consents on first
connect. Send scopes are added later with draft replies (approval-gated).

## 4. Fill the env (`.env.local`)

```bash
MS_GRAPH_CLIENT_ID=<Application (client) ID>
MS_GRAPH_CLIENT_SECRET=<client secret value>
MS_GRAPH_TENANT=common            # multi-tenant + personal accounts
TOKEN_ENCRYPTION_KEY=<long random value, e.g. openssl rand -hex 32>
```

Only **CLIENT_ID** and **CLIENT_SECRET** come from Azure. `MS_GRAPH_TENANT` and
`TOKEN_ENCRYPTION_KEY` are already set in `.env.local`. Restart `npm run dev`.

### Redirect URI — no env needed

The callback URL **auto-derives from the domain the app runs on**
(`<origin>/api/outlook/callback`). You do **not** set a redirect env var per
environment — you just **register the callback URL(s) on the Azure app**
(Authentication → Redirect URIs). Add each environment you use:

```txt
http://localhost:3000/api/outlook/callback      (dev)
https://<your-domain>/api/outlook/callback       (production — HTTPS)
https://<preview-url>/api/outlook/callback        (optional previews)
```

Same client ID/secret works across all of them. (Override with
`MS_GRAPH_REDIRECT_URI` only if you're behind a proxy where the public URL
differs from the request origin.)

## 5. Try it

Sign in → **Settings** (gear icon, top-right) → **Connect Outlook** → approve at
Microsoft → you return to Settings as **Connected**. Click **Test connection** to
verify a live Graph `/me` call. **Disconnect** removes the tokens + integration.

## Security notes

- One app secret lives server-side only (`.env.local` / deploy env) — never in
  the browser. Per-user tokens are encrypted (AES-256-GCM) and stored in the
  private schema, reachable only via service-role RPCs.
- The redirect URI must match exactly (scheme, host, port, path).
- Least privilege: read scopes only for now; nothing is sent without approval.
