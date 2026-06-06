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
│   │   │                         #   sidebar collapse, rail collapse, chat drawer
│   │   ├── Sidebar.tsx           # Collapsible nav (full <-> icon rail); switches views
│   │   ├── Topbar.tsx            # Greeting, search, theme toggle, AI-rail chevron toggle
│   │   ├── MorningBrief.tsx      # Hero brief with a compact urgency ring in its header
│   │   ├── UrgencyRing.tsx       # Full + CompactUrgencyRing SVG rings
│   │   ├── KpiCards.tsx          # Top metric cards
│   │   ├── TodaysRadar.tsx       # Work queue + filter tabs (client)
│   │   ├── WorkItemRow.tsx       # A single radar row
│   │   ├── AiAnalysisPanel.tsx   # Right-rail reasoning + suggested draft + safety copy
│   │   ├── MemoryView.tsx        # Main-area "Memory & Rules" view (left-nav target)
│   │   ├── ManagerMemoryPanel.tsx# Add/forget manager memories (client)
│   │   ├── AssistantChat.tsx     # Right-side chat drawer opened by a FAB (client)
│   │   └── HowItWorks.tsx        # 5-step explainer strip
│   ├── ui/                       # Shared primitives
│   │   ├── Chip.tsx
│   │   └── Icon.tsx              # Stroked icon set + Vesta flame mark
│   └── __tests__/                # Component tests (Vitest)
│
├── lib/
│   ├── types.ts                  # UI types mirroring docs/database/schema-v1.md
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

- **Sidebar** collapses between a full panel and an icon-only rail (toggle at top).
- **Main area** swaps between the **Today** view (brief, KPIs, radar, how-it-works)
  and the **Memory & Rules** view, driven by the left nav.
- **Right rail** holds only the AI Analysis panel on the Today view; a chevron
  toggle in the top bar collapses/expands it.
- **Assistant chat** is a floating "Ask Vesta" button (bottom-right) that opens a
  right-side drawer with a backdrop; closes on the X, backdrop click, or Escape.

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
  marked `'use client'` (Topbar, TodaysRadar, ManagerMemoryPanel, AssistantChat,
  DashboardClient, ThemeProvider).
- Tests sit in `__tests__/` next to the code they cover; E2E lives in `e2e/`.
- The `@/*` path alias maps to the repo root.
