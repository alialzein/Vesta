# Testing Strategy

## Principle

The app handles sensitive email and manager decisions. Features are not complete without tests.

## Test levels

```txt
Unit tests        Pure business logic
Integration      Graph/Supabase/AI boundaries with mocks
E2E              Critical user flows
Manual QA        Realistic manager scenarios
Security tests   RLS and secret exposure
```

## Minimum test coverage by phase

### Phase 0 dashboard shell

- Component render smoke tests if test framework exists.
- No real data required.

### Phase 1 database

- Migration runs locally.
- RLS manual or automated verification.
- Generated types compile.

### Phase 4 email sync

- Mock Graph initial sync.
- Inbox message upsert.
- Sent message upsert.
- Thread grouping.
- People extraction.

### Phase 6 follow-up engine

- Unit tests for waiting_on_manager.
- Unit tests for waiting_on_other.
- Unit tests for repeated follow-ups.
- Unit tests for manager already replied.
- Unit tests for VIP priority floor.

### Phase 7 AI analysis

- Schema validation tests.
- Invalid JSON retry/fallback tests.
- Cost/token storage tests with mocks.
- Sensitive topic flag tests.

### Phase 8 reminders

- Timezone tests.
- Due reminder selection tests.
- Snooze tests.
- Recurring reminder tests if implemented.

### Phase 9 drafts

- Draft generation mock.
- Edit/approve state transitions.
- Send requires approved status.
- Audit log exists.

## Required CI checks later

```txt
lint
typecheck
unit tests
integration tests with mocks
build
```

## Definition of done

A task is done only when:

- Code works.
- Tests added or explicitly not applicable.
- Tests run or reason documented.
- Docs updated.
- Security concerns checked.
