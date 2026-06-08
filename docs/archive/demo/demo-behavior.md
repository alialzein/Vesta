# Demo Behavior — What's Real vs. Placeholder

This dashboard is **frontend / demo only** through Phase 0.x. It runs entirely on
hardcoded data in [`lib/demo-data.ts`](../../lib/demo-data.ts) with **no**
Supabase, Microsoft Graph, OpenAI/AI API, authentication, database, email
sending, or secrets. This doc lists what currently works, what is a placeholder,
and what becomes real in Phase 1/2.

## What is currently real

- The full dashboard UI and layout (dark + light themes; dark is the default).
- Local React state and navigation:
  - Selecting a Today's Radar item updates the right AI Assistant Rail.
  - Today's Radar filters (All / Decisions / Blockers / Follow-ups / Promises /
    Can delegate / Drafts).
  - Sidebar collapse/expand + mobile drawer.
  - Right rail collapse/expand + tab switching (Action / Draft / Memory / Activity).
  - Theme toggle (persisted to `localStorage`).
  - Manager Memory panel: add/forget memories (in-memory for the session only).
  - Quick-action preview drawers (Focus Mode, Meeting Prep, Clean Inbox) open and
    render demo content.
  - Toast feedback for placeholder actions.

## What is demo-only / placeholder

| Surface                                                | Behavior today                                  | Becomes real in                             |
| ------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------- |
| Topbar **Search**                                      | Decorative input, no results                    | Later (search index)                        |
| Topbar **Outlook status**                              | Static "Synced 2 min ago"                       | Phase 3 (Graph OAuth)                       |
| Topbar **Notifications** bell                          | Static count, no panel                          | Phase 5/11                                  |
| Topbar **Settings**                                    | No-op button                                    | Later (settings page)                       |
| Topbar **Profile** avatar                              | No menu                                         | Phase 2 (auth/profile)                      |
| Morning Brief quick actions                            | Open drawers / filter radar / toast             | Phase 9/11                                  |
| **Clear My Day**                                       | Opens Focus Mode preview drawer                 | Phase 11                                    |
| **Meeting Prep**                                       | Opens Meeting Prep preview drawer               | Phase 11/12                                 |
| **Delegate**                                           | Filters radar to "Can delegate" + toast         | Phase 9/10                                  |
| **Draft Replies**                                      | Toast only                                      | Phase 9                                     |
| Rail **Approve Draft / Ask Legal / Delegate / Snooze** | Toast: "Demo action recorded…"                  | Phase 9                                     |
| Rail **Add a memory or rule**                          | Toast (needs approval later)                    | Phase 10                                    |
| **Ask Vesta** chat                                     | Canned/mock replies only                        | Phase 7+                                    |
| **AI Command Center** large cards                      | Not rendered on Today page (flag-gated)         | Reserved for a future expanded-actions page |
| **Vesta splash screen** (0.5 rev)                      | Full-screen branded splash (~1.8s) on each load | First login/session or real data loading    |

All action buttons that imply an external effect show the standard line:

> "Demo action recorded. Real Outlook actions will be added in Phase 2."

This reinforces the safety rule (AGENTS.md): **Vesta never sends email without
explicit approval**, and nothing is sent in demo mode.

## Reusable UI states (ready for Phase 1/2)

`components/ui/StateView.tsx` ships ready-to-use empty/loading/error states so
real data flows can drop them in:

- `EmptyRadarState`, `LoadingWorkItemsState`, `OutlookNotConnectedState`,
  `AiUnavailableState`, `NoMemoriesState`, `NoDraftsState`.

`EmptyRadarState` is already wired into Today's Radar (shown when a filter has no
matches).

## What becomes real in Phase 1/2

- **Phase 1 (Database foundation):** Supabase schema + RLS. Demo exports in
  `lib/demo-data.ts` get replaced by typed Supabase queries returning the same
  `lib/types.ts` shapes.
- **Phase 2 (Auth + profile):** real session, the topbar profile, protected route.
- **Phase 3+:** Outlook connection, sync, AI analysis, drafts, memory approval.

## Demo feature flags

- `SHOW_LARGE_COMMAND_CENTER` in
  [`components/dashboard/DashboardClient.tsx`](../../components/dashboard/DashboardClient.tsx)
  — `false` by default (Phase 0.3). Flip to `true` to render the large
  `AiCommandCenter` cards on the Today page again.
