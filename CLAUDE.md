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
