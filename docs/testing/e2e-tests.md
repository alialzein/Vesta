# E2E Test Requirements

Use Playwright or the project's chosen E2E tool.

## MVP flows

```txt
login
view dashboard
open work item
filter Today's Radar
generate draft mock
edit draft
approve send mock
quick add task
set reminder
create memory
mark item done
```

## Dashboard E2E details

Test that the user can:

- See KPI cards.
- Filter by Decisions.
- Filter by Follow-ups.
- Open AI Analysis panel.
- See suggested action.
- See safety copy on draft.

## Memory E2E details

Test that the user can:

- Add VIP memory.
- Edit memory.
- Disable memory.
- See pending AI suggestion.
- Approve suggestion.

## Negative E2E tests

- User cannot access dashboard when logged out.
- Draft cannot send without approval.
- UI does not show Graph tokens or secrets.
