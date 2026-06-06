# Login Experience v1 — AI Brand Polish

**Branch:** `feature/login-ai-polish`
**Scope:** Frontend / demo-safe brand polish of the existing login screen. No
redesign, no new backend. Builds on Phase 2 auth (`app/(auth)/`).

## Purpose

Make the login screen feel like **entering Vesta — an AI command center for
executive work**: premium, intelligent, calm, futuristic, organized, secure,
alive. It must not feel generic, cyberpunk, noisy, or gimmicky. The centered
layout and structure from Phase 2 are preserved; this is a polish pass.

## Structure (unchanged)

Centered composition: Vesta brand core on top → "AI workspace ready" status chip
→ welcome title + subtitle → auth card → mode switch → trust cues + privacy note.
No split-screen, no marketing landing page.

Inside the card the order signals hierarchy:

```txt
Continue with Microsoft   (primary CTA, demo-only in this phase)
── or use email ──        (divider)
Full name                 (sign-up only)
Email
Password
Confirm password          (sign-up only)
Sign in / Create account  (secondary button)
```

## Microsoft sign-in (demo-only in this phase)

Microsoft is the **primary** login CTA because Vesta is a Microsoft-centric tool.

**Decision (product):** the login-page Microsoft button is **sign-in / SSO only** —
"who you are". **Reading email is a separate concern**: connecting the Outlook
mailbox is a distinct **"Connect Outlook"** step in Settings/onboarding (Microsoft
Graph OAuth with mailbox scopes), not part of logging in. The login screen states
this explicitly via a caption ("Use your Microsoft account to sign in. You'll
connect your Outlook mailbox for email later in Settings.").

Both are **Microsoft Graph OAuth, not SMTP/IMAP** — users never enter mail server
credentials. **Both are Phase 3.** For now the button is demo-only: clicking it
shows the loading transition (spinner + rotating copy), then a note explaining
SSO + the separate Settings step. It never calls a real API. Email/password is
the working **secondary** login option (the Phase 2 Supabase server actions).

The same button serves sign-in and sign-up (OAuth auto-creates the account on
first use), so it is shown in both modes — there is no separate "sign up with
Microsoft".

## AI identity choices

- **Brand core** (`app/(auth)/VestaAuthCore.tsx`) — a smaller, calmer sibling of
  the initialization splash (`components/dashboard/VestaSplashScreen.tsx`): a
  breathing luminous core with the Vesta mark, two slow orbit rings (one
  counter-rotating), traveling signal nodes, and soft halo blooms. It reuses the
  shared `vesta-*` motion classes so the login and splash read as one system.
- **Background** (`app/(auth)/LoginAtmosphere.tsx`) — low-opacity blue/cyan
  radial blooms (shared `--atmos-*` tokens) plus a far-background signal grid
  (`.vesta-login-grid`) that is **masked out of the center** (vignette) so it only
  appears around the centered, opaque card — never behind readable content.
- **Card** — an "AI console panel": faint top edge light, soft glow, focus rings
  on inputs (`focus:shadow … var(--accent-soft)`), leading mail/lock icons.
- **Button** — gradient with a sweeping sheen (`vesta-btn-shimmer`) on hover and
  continuously while loading.

## Login → splash relationship

The login is the calm "entry portal"; the splash is the brief "initialization".
On a successful sign-in the server action redirects to `/`, where
`DashboardClient` plays the `VestaSplashScreen` on mount — so the flow is:

```txt
Sign in (button shows spinner + rotating copy:
  "Signing you in" → "Preparing your workspace" → "Loading Vesta")
  → redirect to /
  → Vesta initialization splash
  → dashboard
```

The button's rotating copy is the deliberate hand-off cue into the splash.

## Login motion principles

Follows `docs/design/ai-motion-principles.md`. On this screen:

- **Allowed:** slow orbit + breathing core, soft halo, button sheen/shimmer,
  input focus glow, loading spinner + rotating copy, opacity/transform only.
- **Avoided:** particles, neon flicker, high-frequency motion, anything behind
  the form text.
- **Timing:** orbit 13–22s, breathe 3.2s, shimmer 1.5s, focus/hover 150–220ms.

## Reduced-motion behavior

All decorative loops use the shared `animate-vesta-*` / `animate-spin-slow`
classes, which are disabled in the global `prefers-reduced-motion: reduce` block
in `app/globals.css`. Result for reduced-motion users: a **static** brand core
(rings/halo still present, just not moving), a static background, and a static
button (no sheen). The form, focus rings, loading text, and spinner state remain
fully usable. The atmosphere itself has no animation.

## Accessibility

- Decorative layers are `aria-hidden` + `pointer-events-none`.
- Inputs have visible labels and leading icons (icons are decorative/aria-hidden).
- The submit button sets `aria-busy` while pending and the status text is in an
  `aria-live="polite"` region; password-mismatch shows a `role="alert"`.
- Global `:focus-visible` accent ring is preserved; contrast unchanged.

## Demo-safety

No new backend/API/DB. Sign-in/up call the Phase 2 Supabase server actions that
already exist; if env is absent they surface an inline error (the screen still
renders and animates). Confirm-password is validated client-side (it disables the
submit button and shows an inline warning) and re-checked in the `signUp` server
action.

## Tests

`components/__tests__/AuthForm.test.tsx` covers: sign-in renders with the
animated AI core (`vesta-auth-core` testid) + "AI workspace ready" chip; the
Microsoft primary CTA + "or use email" divider + email/password fields; trust
cues; a Microsoft click enters a demo loading state (`aria-busy`, disabled) and
makes **no** real call (the mocked `signIn`/`signUp` are not invoked); mode
switch reveals full-name + confirm-password; password-mismatch warns + disables
submit; safety copy. (`useFormState`/`useFormStatus` are stubbed — they need the
Next runtime, not jsdom.)

Playwright (`e2e/login.spec.ts`) smoke-tests the live login (logged-out). The
dashboard specs (`e2e/dashboard.spec.ts`) are **auth-protected** (Phase 2), so
they run with a session created once by the **auth fixture**
(`e2e/auth.setup.ts`): it signs the dev test user in via the UI and saves
`storageState` (`playwright/.auth/user.json`, gitignored). The login spec forces
a logged-out state with `test.use({ storageState: { cookies: [], origins: [] } })`.
Dev creds come from `.env.local` (`E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`); create
the account with `node scripts/create-dev-user.mjs`. If creds are absent the
dashboard specs skip (not fail).
