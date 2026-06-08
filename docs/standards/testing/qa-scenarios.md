# Manual QA Scenarios

Create fixture data for these scenarios.

## Email scenarios

1. VIP sender, no follow-up.
2. VIP sender, three follow-ups.
3. Newsletter/automated email.
4. Manager is CC only.
5. Client asks for approval today.
6. Manager already replied.
7. Manager is waiting for someone else.
8. Legal contract risk.
9. Payment/invoice delegation.
10. Angry client escalation.

## Commitment scenarios

1. Manager says: “I will send it tomorrow.”
2. Sender says: “I will update you by Monday.”
3. Sender asks: “Can you confirm by 4 PM?”
4. Promise has no due date.
5. Promise is already completed in later message.

## Decision scenarios

1. Clear approve/reject request.
2. Missing information before approval.
3. Legal approval needed first.
4. Finance approval can be delegated.
5. Decision overdue.

## Reminder scenarios

1. Reminder today.
2. Reminder tomorrow morning.
3. Snooze reminder.
4. Cancel reminder.
5. Timezone conversion.

## Expected checks for every scenario

- Correct category.
- Reasonable priority score.
- User-visible reason makes sense.
- Suggested action is safe.
- Draft does not overpromise.
- Sensitive topics require review.
- Audit log exists for sensitive actions.
