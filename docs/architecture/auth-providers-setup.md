# Auth Providers Setup (SSO) — Phase 2b

The login screen has **Continue with Microsoft** and **Continue with Google**
buttons. They call `supabase.auth.signInWithOAuth({ provider })` and redirect to
`/auth/callback`. The code ships ready, but each provider must be **enabled in the
Supabase dashboard with an OAuth app** before it actually works. Until then,
clicking shows a graceful "… isn't available yet" message; email/password login
still works.

> Login SSO is **identity only** — it does not read email. Connecting a mailbox
> (Outlook/Gmail/IMAP) is a separate step in Settings (Phase 3+). See
> `docs/product/auth-onboarding-and-mailbox-plan.md`.

## Redirect / callback URL

All providers redirect back to Supabase, which then returns to the app:

```txt
Supabase callback (set in each provider's console):
  https://jgxlcjhnnuuruwyxonbt.supabase.co/auth/v1/callback

App return URL (already implemented):
  http://localhost:3000/auth/callback   (dev)
  https://<your-domain>/auth/callback    (prod)
```

In Supabase → Authentication → URL Configuration, add the app URLs to
**Redirect URLs** (e.g. `http://localhost:3000/**`).

## Google

1. Google Cloud Console → APIs & Services → **Credentials** → Create **OAuth client ID**
   → Web application.
2. Authorized redirect URI: `https://jgxlcjhnnuuruwyxonbt.supabase.co/auth/v1/callback`
3. Copy the **Client ID** + **Client secret**.
4. Supabase → Authentication → **Providers → Google** → enable, paste ID + secret, save.

## Microsoft (Azure / Entra)

1. Azure Portal → **Microsoft Entra ID → App registrations → New registration**.
2. Redirect URI (Web): `https://jgxlcjhnnuuruwyxonbt.supabase.co/auth/v1/callback`
3. **Certificates & secrets** → new client secret → copy the value.
4. Note the **Application (client) ID**.
5. Supabase → Authentication → **Providers → Azure** → enable, paste client ID +
   secret; set the Azure tenant URL if required (common: `https://login.microsoftonline.com/common/v2.0`).

> Note: this Azure app is for **login SSO**. The **mailbox** Graph app (with
> `Mail.Read` etc.) in Phase 3 can be the same registration with added scopes, or
> a separate one — decided when Phase 3 starts.

## Verify

After enabling a provider, reload `/login` and click its button — you should be
redirected to the provider, then back to the dashboard. The `profiles` row is
auto-created by the signup trigger for OAuth sign-ups too.
