# Project Structure

This documents the application folder layout introduced in **Phase 0**
(dashboard shell). It complements `overview.md` and
`nextjs-supabase-edge-functions.md`, which describe the target runtime
architecture.

## Stack (Phase 0)

```txt
Framework:   Next.js 14 (App Router) + React 18 + TypeScript
Styling:     Tailwind CSS with CSS-variable theming (Arctic Frost palette)
Unit tests:  Vitest + Testing Library (jsdom)
E2E tests:   Playwright (Chromium)
Lint/format: ESLint (next/core-web-vitals) + Prettier
```

Styling decision: layout and spacing use Tailwind utilities; the theme
(dark/light) is driven by CSS variables in `app/globals.css`, mapped to Tailwind
tokens in `tailwind.config.ts`. This keeps a near 1:1 match with the original
HTML mockup while staying idiomatic.

## Folder layout

```txt
.
├── app/                          # Next.js App Router
│   ├── globals.css               # Arctic Frost palettes (dark+light) + base styles
│   ├── layout.tsx                # Root layout, mounts ThemeProvider, sets <html data-theme>
│   └── page.tsx                  # Dashboard route (server component -> DashboardClient)
│
├── components/
│   ├── dashboard/                # Dashboard sections
│   │   ├── DashboardClient.tsx   # Owns shell state: selection, active view,
│   │   │                         #   sidebar collapse + mobile drawer, rail
│   │   │                         #   collapse + active tab, chat drawer
│   │   ├── Sidebar.tsx           # Composes header/nav/footer; desktop column +
│   │   │                         #   mobile overlay drawer
│   │   ├── SidebarHeader.tsx     # Brand + collapse/expand toggle (no logo overlap)
│   │   ├── SidebarNav.tsx        # Expanded/collapsed nav, badges, tooltips
│   │   ├── SidebarFooter.tsx     # Profile card (simplified when collapsed)
│   │   ├── Topbar.tsx            # Greeting + utility toolbar: search, Outlook
│   │   │                         #   status, bell, settings, theme, rail toggle,
│   │   │                         #   avatar, mobile hamburger
│   │   ├── MorningBrief.tsx      # Compact brief: badge, headline, top-risk chip,
│   │   │                         #   4 quick actions (0.3; ring removed)
│   │   ├── UrgencyRing.tsx       # Full + CompactUrgencyRing SVG rings (kept for reuse)
│   │   ├── MetricsStrip.tsx      # Compact KPI metrics strip (0.3; replaces KpiCards)
│   │   ├── AiCommandCenter.tsx   # Gradient cards — RESERVED, not on Today page
│   │   │                         #   (flag-gated SHOW_LARGE_COMMAND_CENTER=false)
│   │   ├── KpiCards.tsx          # Old KPI cards — retained, no longer rendered
│   │   ├── TodaysRadar.tsx       # Work queue + filter tabs (controlled or internal)
│   │   ├── WorkItemRow.tsx       # A radar row (source, person, reason, action chips)
│   │   ├── AiAssistantRail.tsx   # Contextual AI rail: Action/Draft/Memory/Activity
│   │   ├── CollapsedRail.tsx     # Slim vertical icon strip for the collapsed rail
│   │   ├── FocusMode.tsx         # Full-screen "Clear My Day" pass (Phase 11, real)
│   │   ├── MeetingPrepDrawer.tsx # "Meeting Prep" preview drawer (demo)
│   │   ├── CleanInboxDrawer.tsx  # "Clean Inbox" preview drawer (demo)
│   │   ├── MemoryView.tsx        # Full-page "Memory & Rules" workspace (0.4):
│   │   │                         #   add form, category tabs, list, help panel
│   │   ├── ManagerMemoryPanel.tsx# Compact add/forget memory card (retained, reused)
│   │   ├── VestaSplashScreen.tsx # Full-screen opaque branded init splash (0.5 rev)
│   │   ├── MobileRailSheet.tsx   # Phone bottom sheet hosting the AI rail (tap a card)
│   │   └── DashboardAtmosphere.tsx# Subtle blue/cyan radial blooms (no grid) (0.5)
│   ├── ui/                       # Shared primitives
│   │   ├── Chip.tsx
│   │   ├── Drawer.tsx            # Shared right-side slide-in drawer
│   │   ├── Toast.tsx             # ToastProvider + useToast (demo feedback)
│   │   ├── StateView.tsx         # Empty/loading/disconnected/error states
│   │   └── Icon.tsx              # Stroked icon set + Vesta flame mark
│   └── __tests__/                # Component tests (Vitest)
│
├── lib/
│   ├── types.ts                  # UI types mirroring docs/reference/database/schema-v1.md
│   ├── demo-data.ts              # *** ONLY home for placeholder data ***
│   ├── priority.ts               # Pure helpers (priorityBand, filterWorkItems)
│   ├── theme.tsx                 # ThemeProvider + useTheme (dark/light)
│   └── __tests__/                # Unit tests for pure logic
│
├── e2e/                          # Playwright specs
│   └── dashboard.spec.ts
│
├── docs/                         # Documentation pack (unchanged by Phase 0)
├── *.html                        # Original mockups (kept for reference)
├── package.json, tsconfig.json, next.config.mjs
├── tailwind.config.ts, postcss.config.mjs
├── vitest.config.ts, vitest.setup.ts, playwright.config.ts
├── .eslintrc.json, .prettierrc.json, .env.example, .gitignore
```

## Layout behavior

- **Sidebar** collapses between a full panel (~280px) and an icon-only rail
  (~88px). Below `lg` it is hidden and opens as a mobile overlay drawer from the
  topbar hamburger. The collapse toggle never overlaps the logo (see
  `docs/archive/design/visual-direction-v2.md`).
- **Main area** swaps between the **Today** view (compact brief, metrics strip,
  Today's Radar, how-it-works) and the **Memory & Rules** view, driven by the left
  nav. (Phase 0.3 removed the large AI Command Center cards and the six KPI cards
  from this view; quick actions now live in the compact brief.)
- **Right rail** is the **Contextual AI Assistant Rail** on the Today view, with
  Action/Draft/Memory/Activity tabs. The topbar AI toggle collapses it to a slim
  64px icon strip (clicking an icon re-expands to that tab). Below `lg` it stacks
  below the main content.
- **Ask Vesta** is a floating button (bottom-right) and a sidebar item that both
  navigate to the real `/chat` page (`components/chat/ChatView.tsx`,
  `app/actions/chat.ts`) — the manager's second-brain chat with the learning
  loop into `manager_memories`. (The old demo drawer is gone.)

> Phase 0.1 ("dashboard polish") refreshed the light theme into a premium light
> SaaS palette, added the topbar utility toolbar, AI Command Center, the
> contextual AI rail, and the sidebar collapse fix. Phase 0.2 added demo
> interactions (toasts, drawers, UI states). Phase 0.3 ("focus & simplicity")
> simplified the Today page: compact brief, metrics strip, command-center cards
> removed, Today's Radar promoted. Phase 0.4 ("final UI fixes") cleaned the topbar
> (icon-only rail toggle, profile name, simplified Outlook status, badge/heading
> clip fixes), tinted the light-mode AI rail (`--rail-bg`), removed Delegate from
> the brief, made Memory & Rules a full page, and fixed Today's Radar scrolling.
> Phase 0.5 ("AI brand polish") reduced "boxes-in-boxes" in the radar rows, turned
> the Morning Brief into a live AI signal card (pulse + shimmer + corner-respecting
> accent), added a branded Vesta initialization screen, a subtle blue atmospheric
> background, a LIVE pulse in the AI rail, and calm AI motion with full
> reduced-motion support. The 0.5 **revision** then made the splash a true
> full-screen, opaque `VestaSplashScreen` (orbital rings + radar + nodes, shown
> on every full page load; the earlier version was see-through),
> promoted the atmosphere to a `DashboardAtmosphere` component, pushed the radar
> rows borderless-until-hover, and made **dark mode the default theme**. The 0.5
> **final polish** then made dark-mode card surfaces opaque (`--panel` solid
> dark-blue) and **removed the grid from the dashboard atmosphere** (it read as
> graph paper behind the work list) — leaving only soft radial blooms in the
> shell background; a grid now lives only on the splash. The splash also gained a
> soft radial field, more nodes, an equalizer, and a branded progress bar.
> Full details: `docs/archive/design/visual-direction-v2.md`,
> `docs/archive/design/final-ui-fixes-phase-0-4.md`, `docs/archive/design/loading-experience-v1.md`,
> `docs/archive/design/ai-motion-principles.md`, and `docs/archive/demo/demo-behavior.md`.
> Still demo-only (no backend/AI).

## Auth layer (Phase 2)

```txt
middleware.ts                      # refreshes session, protects routes
lib/supabase/
├── client.ts                      # browser client (anon key)
├── server.ts                      # server client bound to request cookies
├── service.ts                     # service-role client (server-only; private RPCs)
├── middleware.ts                  # updateSession + isPublicPath (route guard)
├── auth.ts                        # getCurrentUser / requireUser / getProfile
└── account.ts                     # getAccountView (display name/initials/email)
lib/graph/                         # Phase 3 — Microsoft Graph / Outlook
├── crypto.ts                      # AES-256-GCM token encryption (server-only)
├── oauth.ts                       # config, authorize URL, code exchange, refresh
├── client.ts                      # Graph REST helper (/me)
├── mail.ts                        # Phase 4 — fetch recent Inbox/Sent (delta-ready)
├── tokens.ts                      # store + getValidAccessToken (auto-refresh)
└── subscriptions.ts               # Phase 5 — Graph webhook subs (scaffold, dormant)
lib/sync/                          # Phase 4 — email sync
└── outlook.ts                     # pure row builders + syncOutlookForUser
                                   #   (upserts; Phase 6 adds thread flags + work_items)
lib/sync/auto.ts                   # Phase 5 — shouldAutoSync (pure, tested)
components/sync/AutoSync.tsx        # Phase 5 — invisible background auto-sync
app/api/outlook/webhook/route.ts   # Phase 5 — Graph notification endpoint (scaffold)
lib/engine/                        # Phase 6/6.5 — pure engines (no DB)
├── threads.ts                     # computeThreadState / scoreThread / categorizeThread
├── triage.ts                      # classifyEmail — include/hide noise + reason (6.5)
└── __tests__/                     # unit tests for the calculators
app/
├── (auth)/
│   ├── actions.ts                 # signIn / signUp / signOut server actions
│   ├── AuthForm.tsx               # sign-in/sign-up form: Microsoft CTA (demo) +
│   │                              #   email secondary, AI core, status chip, trust cues
│   ├── VestaAuthCore.tsx          # small animated AI signal core (login brand)
│   ├── LoginAtmosphere.tsx        # subtle background blooms + far signal grid
│   └── login/page.tsx             # /login (public)
scripts/
└── create-dev-user.mjs            # dev-only: create/refresh the shared test user
e2e/
├── auth.setup.ts                  # Playwright auth fixture → saves storageState
├── dashboard.spec.ts              # runs authenticated (auth fixture)
└── login.spec.ts                  # runs logged-out
├── auth/callback/route.ts         # email-confirmation / OAuth code exchange
├── api/outlook/
│   ├── connect/route.ts           # start Outlook OAuth (redirect to Microsoft)
│   └── callback/route.ts          # exchange code, /me, save integration + tokens
├── settings/
│   ├── page.tsx                   # Settings (Outlook connection card)
│   └── actions.ts                 # disconnectOutlook / testOutlook / syncOutlook
├── inbox/page.tsx                 # Phase 4 — real synced messages (sidebar Inbox)
├── priorities/page.tsx            # Phase 6 — work_items waiting on the manager
│                                  #   (sidebar "Waiting on Me"), ranked + reasons
├── hidden/page.tsx                # Phase 6.5 — triage Hidden review (Always allow)
├── onboarding/
│   ├── page.tsx                   # first-run gate -> OnboardingWizard (or redirect)
│   ├── OnboardingWizard.tsx       # full-screen wizard (client)
│   └── actions.ts                 # completeOnboarding / skipOnboarding (saves memories)
└── page.tsx                       # protected: requireUser() + onboarding gate -> Dashboard
supabase/migrations/
├── 20260606150001_profiles_signup_trigger.sql  # auto-create profile on signup
└── 20260606160001_add_profiles_onboarded_at.sql # onboarding completion flag
```

Auth model: Supabase email/password via `@supabase/ssr`. Middleware refreshes the
session on every request and redirects unauthenticated users to `/login` (and
authenticated users away from `/login`). `requireUser()` is the data-layer
backstop in the protected page. The dashboard greeting + sidebar profile come
from the signed-in account; the rest of the dashboard still renders demo data
until later phases wire real queries. Sign-out lives in the sidebar footer.

## Data flow (Phase 0)

```txt
lib/demo-data.ts  ->  app/page.tsx  ->  DashboardClient  ->  section components
```

No network, database, Microsoft Graph, or AI calls happen anywhere. Replacing
`lib/demo-data.ts` exports with Supabase queries (returning the same `lib/types.ts`
shapes) is the migration path for later phases.

## Conventions

- Pure business logic lives in `lib/` as small testable functions.
- Components are server components unless they need state/effects; those are
  marked `'use client'` (Topbar, TodaysRadar, ManagerMemoryPanel, ChatView,
  DashboardClient, ThemeProvider).
- Tests sit in `__tests__/` next to the code they cover; E2E lives in `e2e/`.
- The `@/*` path alias maps to the repo root.
