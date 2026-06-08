# CLAUDE.md — Instructions for Claude or Other Code Assistants

Follow `AGENTS.md` first. This file only adds Claude-specific working style preferences.

## Multi-machine workflow (read this first)

The owner works on this project from **two machines** (work laptop and home
laptop), switching back and forth. Git is the single source of truth.

- **At the start of a session:** `git pull` before doing anything, so you're not
  building on a stale tree the other machine has moved past.
- **At the end of a session:** make sure all work is committed and pushed before
  stopping. Don't leave uncommitted WIP — `git stash` is local-only and will NOT
  travel to the other machine. For cross-machine WIP, push a real commit on a
  branch (squash/amend later).
- **Branch + PR flow:** non-`main` work goes on a branch → push → open a PR →
  wait for the owner's explicit confirmation before merging (never auto-merge) →
  after merge, sync local `main`.
- **Untracked/secret files don't sync.** `.env.local` and other gitignored files
  exist per-machine only; set them up separately on each laptop.

## Working style

1. Read the relevant docs before editing.
2. Restate the exact scope before coding.
3. Make small, reviewable changes.
4. Prefer creating or updating tests in the same task.
5. Update docs in the same task when behavior, schema, routes, AI prompts, or security rules change.
5a. **Every user-facing feature must ship with a user guide in the same task.** When a
   feature is done, create or update its plain-language guide under `docs/guides/`
   (manager voice, no jargon) and add it to `docs/guides/README.md`. A feature is not
   "done" until its guide exists. Keep guides in sync with the app — if they disagree,
   the app is right and the guide must be fixed.
6. Do not silently change architecture decisions.
7. Ask before destructive changes.
8. **Always get explicit confirmation before any database/schema change (a
   migration): propose the SQL first and apply it only after the user approves.**
   Writing application data into existing tables is normal; creating/altering
   tables, columns, indexes, policies, functions, or running a migration is not —
   confirm first.

## UI rules (non-negotiable)

- **Every screen must support both light and dark mode.** This includes auth/login,
  onboarding, dashboards, drawers, empty states, and any new page or component.
  Use the theme CSS variables / Tailwind tokens (e.g. `bg-panel`, `text-ink`,
  `border-line`, `--atmos-*`) — never hardcode colors that only work in one theme.
- The user's theme choice persists across logout/login and reloads (saved in
  `localStorage` as `vesta-theme`; applied pre-paint in `app/layout.tsx`). Default
  is dark; do not reset the user's choice.
- When adding UI, verify it in **both** themes before considering it done.

## Navigation performance (non-negotiable)

Navigation must feel instant — never a frozen screen after a click. Whenever you add
a link, nav button, or a new route, apply **both**:

1. **Prefetch the target.** Any control that navigates to a real app route uses
   `next/link`'s `<Link href=… prefetch>` (explicit `prefetch`), not a raw `<a>` or
   a bare `router.push`. This preloads the route's code + data before the click.
   (See the sidebar/topbar nav links.)
2. **Give the route an instant skeleton.** Every route whose page does server-side
   data fetching gets a `loading.tsx` that renders a **theme-aware** skeleton. Reuse
   [`components/ui/PageSkeleton.tsx`](components/ui/PageSkeleton.tsx) for centered
   list pages (Inbox/Priorities/Settings pattern); match the panel/card design and
   support both light + dark. So a click shows a placeholder immediately, not a hang.

Also keep server work cheap: validate the user once per request (`getCurrentUser` is
`cache()`-wrapped) and **pass the fetched user down** to `getProfile`/`getAccountView`
rather than re-fetching; run independent queries with `Promise.all`. Don't reintroduce
serial `getUser` round-trips.

## Project priorities

The first working product must prioritize:

1. Reliable Outlook sync.
2. Unified `work_items` dashboard.
3. Follow-up and waiting-on-manager detection.
4. AI analysis with user-visible reasons.
5. Draft replies with explicit approval.
6. Memory/rules that the manager controls.

## Code review checklist

Before finishing, check:

- Does this reduce manager time?
- Does it preserve privacy and approval gates?
- Does it update database docs if schema changed?
- Does it add tests for logic?
- Does it avoid hardcoded emails/users/tenants/models?
- Does it keep future portability to another email/mailbox?
