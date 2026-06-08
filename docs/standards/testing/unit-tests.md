# Unit Test Requirements

## Priority scoring

Test cases:

- VIP sender increases score.
- Multiple follow-ups set minimum score.
- Due today increases score.
- Manager only CC'd lowers score.
- Newsletter lowers score.
- Already replied lowers score.
- Sensitive topic adds risk flag but does not auto-action.

## Follow-up detection

Test cases:

1. One inbound, no outbound: waiting on manager.
2. One inbound, manager replied: not waiting on manager.
3. Manager replied, then inbound: waiting on manager.
4. Two inbound after last outbound: follow-up count >= 1.
5. Follow-up keywords detected.
6. Latest outbound after inbound: waiting on other.
7. Empty thread: unknown safe result.

## Thread state

Test fields:

```txt
latest_inbound_at
latest_outbound_at
inbound_after_last_outbound_count
followup_count
is_waiting_on_manager
is_waiting_on_other
```

## AI schema validation

Test cases:

- Valid work item analysis passes.
- Invalid category fails.
- Priority below 0 fails.
- Priority above 100 fails.
- Missing user_visible_reason fails.
- Draft reply requires `requires_human_review: true`.

## Memory retrieval

Test cases:

- VIP rule is included.
- Irrelevant memory is excluded.
- Disabled memory is excluded.
- Duplicate memories deduplicate.
