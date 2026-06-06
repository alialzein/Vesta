# Auth, Onboarding & Mailbox Strategy — Product & Architecture Plan

**Project:** Vesta AI Chief of Staff
**Status:** Planning (future) — captures a deliberate expansion of the auth/mailbox
direction. **No code in this document.**
**Relationship to current docs:** This extends the MVP stance in `AGENTS.md` and
`docs/architecture/microsoft-graph-outlook.md` (which scope the MVP to **Microsoft
Graph / Outlook only**). Those remain authoritative for the MVP; the rules here
apply only when the corresponding phase is explicitly started. Do not silently
change the MVP — update `AGENTS.md`/architecture docs when a phase below is built.

---

## 1. The three separate concerns

A recurring source of confusion is conflating these. They are independent:

```txt
1. LOGIN (identity)      = "Who is this user?"  -> creates a Vesta session
2. ONBOARDING (context)  = "Who are they, what do they care about?" -> teaches the AI
3. MAILBOX (email data)  = "Which inbox does Vesta read/act on?" -> syncs email
```

A user may **log in with Google** but **connect an Outlook mailbox** — or log in
with email/password and connect Gmail. Identity ≠ mailbox. Keep them decoupled.

---

## 2. Login — multi-provider identity

### Goal

Let users sign in with the method they prefer; do not require a Microsoft account
to use Vesta.

### Providers (via Supabase Auth — built in, no custom OAuth code)

```txt
Email + password         (Phase 2 — done)
Microsoft (Azure/Entra)  SSO  — "Continue with Microsoft"
Google                   SSO  — "Continue with Google"
(optional later: Apple, etc.)
```

### Rules

- Login providers are an identity choice only. They request **no mailbox scopes**.
- The login-page "Continue with Microsoft" button is **SSO only** (already worded
  this way in the polished login; see `docs/design/login-experience-v1.md`).
- Email confirmation: currently OFF for dev — **re-enable before launch**.
- All providers resolve to one `profiles` row (the signup trigger already handles
  profile creation). Account linking (same person, multiple providers) is a
  later refinement, not MVP.

### Implementation notes (when built)

- Enable providers in the Supabase dashboard + add buttons that call
  `supabase.auth.signInWithOAuth({ provider })`.
- The existing `/auth/callback` route already exchanges the OAuth code.

---

## 3. First-run onboarding tour

### Goal

On first login, a short guided tour collects who the manager is and what matters
to them, so the AI understands them from day one. This is the front-end for the
memory and briefing-preferences we already planned.

### What it collects (and where it lands)

```txt
Role, departments, decisions they make     -> manager_memories (context) / profiles.role
Tone & reply style preferences             -> manager_memories (type=tone)
VIP people / clients                       -> manager_memories (type=vip) / people.is_vip
Delegation rules                           -> manager_memories (type=delegation_rule)
"Never do" rules                           -> manager_memories (type=do_not_do)
Topics / interests / company / competitors -> briefing_preferences (future table)
```

The onboarding questions are already drafted in
`docs/product/personal-intelligence-brief-plan.md` §5 — reuse them.

### Behavior

- Shows once, on first login (persist a `profiles.onboarded_at` / flag).
- Skippable + resumable; everything editable later in Memory & Rules / Settings.
- **Approval-first:** anything that teaches the AI is shown as the user's own
  entries (consistent with the memory approval model).
- Ends by inviting the user to **connect a mailbox** (section 4) — but connecting
  is optional and can be done later.

### Data

- Reuses `manager_memories` (exists). `briefing_preferences` is a future table
  (drafted in the briefing plan) — only added when that phase starts.
- Likely add `profiles.onboarded_at timestamptz` (small migration when built).

---

## 4. Mailbox connection — OAuth-first, provider-agnostic, IMAP later

### Goal

Read/act on the user's email. Eventually support "any email", without compromising
the premium experience or the security model.

### Strategy & priority

**Decision: support BOTH OAuth and IMAP as mailbox connection options.** OAuth is
the preferred path; IMAP is offered for any other provider. **OAuth connections
stay connected automatically** — once set, Vesta refreshes the stored refresh
token in the background so the user never has to reconnect (until they disconnect
or the provider revokes access).

```txt
1. Microsoft Graph (Outlook)   — OAuth, primary. Webhooks. Rich data. Auto-refresh. (Phase 3)
2. Google (Gmail API)          — OAuth. Push notifications. Auto-refresh. (after Outlook)
3. Generic IMAP/SMTP           — supported option for any other email. Polling. Encrypted creds.
```

### Why OAuth-first (not IMAP-first)

|                 | OAuth (Graph / Gmail)                                  | Generic IMAP/SMTP                            |
| --------------- | ------------------------------------------------------ | -------------------------------------------- |
| Credentials     | Token; **no password stored**                          | Must store user's email password (encrypted) |
| Real-time       | **Webhooks / push**                                    | Polling only                                 |
| Data richness   | Threads, categories, importance, send drafts, calendar | Raw messages; weaker threading; SMTP send    |
| Security burden | Lower                                                  | Higher (credential custody)                  |

### Provider-agnostic design (already partly in place)

The schema is built for this — keep it that way:

- `user_integrations.provider`, `mailboxes.provider`, `mailboxes.provider_*` fields.
- `email_messages` / `email_threads` keyed by `mailbox_id` + provider IDs (portable).
- Tokens/credentials in the **private** schema (`private.graph_tokens` today; a
  generalized `private.mailbox_credentials` later for IMAP, encrypted).

### IMAP caveats (when added)

- Encrypt credentials at rest; never expose to the browser; allow easy disconnect.
- Mark it clearly as "Other email (IMAP)" — a degraded mode (polling, fewer
  features), not the default.
- Sending: SMTP, still **draft-first / approve-before-send** (no behavior change).

---

## 5. Suggested phasing

```txt
Phase 2  (done)  Email/password login + profile + route protection.
Phase 2b         Add Google + Microsoft SSO login buttons (Supabase Auth).
Phase 2c         First-run onboarding tour -> manager_memories (+ profiles.onboarded_at).
Phase 3          Connect Outlook (Microsoft Graph OAuth) — the MVP mailbox.
Phase 4–5        Outlook sync (initial + delta + webhooks).
Later            Connect Gmail (Google OAuth).
Later            Other email (IMAP) opt-in + briefing_preferences + Briefing page.
```

This keeps the documented build order intact and only inserts login providers
(2b) and onboarding (2c) before the mailbox work.

---

## 6. Security & privacy

- Login providers request identity scopes only — never mailbox scopes.
- Mailbox tokens/credentials live in the private schema, encrypted; never in the
  browser or in git. (See `docs/security/security-rules.md`.)
- Onboarding data is user-owned (RLS), editable/deletable, and approval-first.
- Re-enable Supabase email confirmation before launch; remove the dev test user.

---

## 7. Decisions (confirmed with product owner)

- **Onboarding:** a **short full-screen wizard** on first login (3–5 steps:
  role → tone → VIPs → topics → connect mailbox), **skippable & resumable**, with
  everything editable later in Settings/Memory. A small dashboard "finish setup"
  nudge covers anything skipped.
- **No demo data.** Do not gate the app on connecting a mailbox. When there is no
  real data yet, show good **empty states** (specific designs to be decided later).
- **Account linking** (same person via multiple providers): **deferred** — one
  primary login method per user for the MVP; revisit later.
- **Mailbox = both OAuth and IMAP** (product owner decision). OAuth (Outlook, then
  Gmail) is the primary, auto-maintained path; **IMAP/SMTP is also a first-class
  option** for any other provider, with encrypted credential storage. OAuth
  connections auto-refresh so they stay connected once set.

### Still to decide later

- Exact empty-state designs per screen (when no mailbox/data).
- Onboarding question set finalization (reuse briefing plan §5).

---

## 8. Note to coding agent (later)

When a phase above is started: update `AGENTS.md` (MVP mailbox stance),
`docs/architecture/microsoft-graph-outlook.md`, `docs/database/schema-v1.md`
(briefing_preferences, profiles.onboarded_at, mailbox_credentials), the data
dictionary, and add tests — per the database/documentation rules. Implement one
phase at a time; do not add IMAP and Gmail at once.
