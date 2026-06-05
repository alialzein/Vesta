# Core Workflows

## Workflow 1 — Manager opens dashboard

```txt
Manager opens Vesta
  ↓
Vesta shows Morning Brief
  ↓
Manager sees biggest risk and first action
  ↓
Manager filters Today's Radar
  ↓
Manager drafts, delegates, reminds, snoozes, or marks done
```

## Workflow 2 — New Outlook email becomes work item

```txt
Outlook receives email
  ↓
Microsoft Graph webhook or delta sync detects change
  ↓
Email is stored in Supabase
  ↓
Thread state is recalculated
  ↓
Work item is created or updated
  ↓
AI analysis runs from queue
  ↓
Dashboard updates
```

## Workflow 3 — Follow-up risk detection

```txt
Thread has inbound email after manager's latest reply
  ↓
Another inbound arrives before manager replies
  ↓
Follow-up count increases
  ↓
Priority score increases
  ↓
Work item category becomes follow_up_risk or must_reply
```

## Workflow 4 — Draft reply

```txt
Manager clicks Draft Reply
  ↓
Vesta loads thread, rules, memories, and tone
  ↓
AI generates safe draft
  ↓
Manager edits/reviews
  ↓
Manager approves
  ↓
Vesta sends through Microsoft Graph
  ↓
Audit log is saved
```

## Workflow 5 — Teach memory

```txt
Manager says: Treat Cedars Group as VIP
  ↓
Vesta creates pending memory/rule
  ↓
Manager confirms
  ↓
Rule affects future priority scoring and draft tone
```

## Workflow 6 — Move to another email/mailbox later

```txt
Manager connects new Microsoft mailbox
  ↓
Vesta creates new mailbox record under same user or approved new user
  ↓
Old data remains linked by user_id and old mailbox_id
  ↓
New data syncs under new mailbox_id
  ↓
Dashboard can show current mailbox only or historical combined view
```
