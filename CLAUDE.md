# CLAUDE.md — Instructions for Claude or Other Code Assistants

Follow `AGENTS.md` first. This file only adds Claude-specific working style preferences.

## Working style

1. Read the relevant docs before editing.
2. Restate the exact scope before coding.
3. Make small, reviewable changes.
4. Prefer creating or updating tests in the same task.
5. Update docs in the same task when behavior, schema, routes, AI prompts, or security rules change.
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
