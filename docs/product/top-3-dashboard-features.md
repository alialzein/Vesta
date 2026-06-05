# Top 3 Features to Add to the Current Dashboard

The current Vesta dashboard already has a strong direction: morning brief, urgency score, today's radar, AI analysis, draft approval, and memory/rules. The best next step is not to add many random features. Add three features that make the dashboard feel like a real manager command center.

## Feature 1 — AI Decision Desk

### Why this fits

The dashboard already shows items like contract approval, finance payment approval, hiring decision follow-up, and urgent reply. These are not just emails. They are decisions waiting on the manager.

### What it does

The AI extracts decisions from emails, messages, tasks, and later meetings.

Examples:

```txt
Approve supplier payment
Confirm contract approval
Decide hiring response
Choose delegate for finance issue
Ask client for missing legal confirmation
```

### Dashboard placement

Add or rename a top metric card:

```txt
Decisions Waiting: 6
```

Add a filter tab in Today's Radar:

```txt
Decisions
```

In the right AI Analysis panel, add decision buttons:

```txt
Approve
Reject
Ask for info
Delegate
Draft reply
Remind me
```

### Data needed

Add fields or structured output on `work_items`:

```txt
requires_decision boolean
requires_approval boolean
decision_type text
decision_options jsonb
decision_due_at timestamptz
decision_status text
```

Optional table later:

```txt
decisions
```

### AI output example

```json
{
  "requires_decision": true,
  "requires_approval": true,
  "decision_type": "contract_approval",
  "decision_options": ["approve", "ask_for_legal_review", "request_more_time"],
  "recommended_decision": "ask_for_legal_review",
  "decision_reason": "The client expects confirmation today, but the message mentions legal confirmation still pending."
}
```

### MVP version

Do not create a separate full decision system yet. Use `work_items` fields first. Add a full `decisions` table only when the workflow becomes richer.

---

## Feature 2 — Promise and Commitment Tracker

### Why this fits

The current dashboard already shows a `Promise detected` tag. This should become a first-class feature.

Managers often lose time because promises are buried inside email threads:

```txt
I will send it tomorrow.
Let me check and get back to you.
We will confirm next week.
I will ask finance.
Please update me by Monday.
```

### What it does

The AI extracts commitments made by the manager and commitments made by others.

Two sections:

```txt
Promises I made
Promises others made to me
```

### Dashboard placement

Add one top metric:

```txt
Promises at Risk: 3
```

Add a Today’s Radar filter:

```txt
Promises
```

Add a small panel inside the right AI Analysis area:

```txt
Detected commitment:
You promised to confirm the hiring decision by Tuesday.

Actions:
Create task | Set reminder | Mark already done
```

### Data needed

Recommended new table:

```txt
commitments
```

Main fields:

```txt
id
user_id
work_item_id
source
source_id
commitment_type: manager_promised | other_promised | requested_from_manager | requested_from_other
promisor_name
promisor_email
owner_user_id
commitment_text
due_at
status: open | done | cancelled | overdue | waiting
confidence
extracted_from_quote
created_at
updated_at
```

### AI output example

```json
{
  "commitments": [
    {
      "commitment_type": "manager_promised",
      "commitment_text": "Confirm the hiring decision",
      "due_at": "2026-06-04T17:00:00+03:00",
      "confidence": 0.84
    }
  ]
}
```

### MVP version

Start with commitments as `work_items` with source `ai_commitment`. Add the dedicated `commitments` table after the first extractor works.

---

## Feature 3 — Clear My Day / Focus Mode

### Why this fits

The current dashboard already has a `Start Focus Mode` button. Make it real.

The manager should click one button and Vesta creates the best order to clear the highest-risk work.

### What it does

AI creates a short work session plan:

```txt
Clear critical work in 42 minutes

1. Reply to Cedars contract approval — 5 min
2. Approve finance payment or delegate to Rania — 4 min
3. Send hiring decision update — 6 min
4. Review 4 prepared drafts — 12 min
5. Snooze low-risk items — 3 min
```

### Dashboard placement

The morning brief button becomes:

```txt
Start Focus Mode
```

Open a Focus Mode drawer/page:

```txt
Now
Next
Later
Done
```

Each item has one primary action only, so the manager does not overthink.

### Data needed

Optional tables:

```txt
focus_sessions
focus_session_items
```

Fields:

```txt
focus_sessions:
- id
- user_id
- started_at
- ended_at
- target_minutes
- status
- summary

focus_session_items:
- id
- session_id
- work_item_id
- position
- estimated_minutes
- recommended_action
- completed_at
```

### AI output example

```json
{
  "session_title": "Clear critical approvals and follow-ups",
  "estimated_total_minutes": 42,
  "items": [
    {
      "work_item_id": "...",
      "position": 1,
      "estimated_minutes": 5,
      "recommended_action": "Approve draft reply after checking legal confirmation."
    }
  ]
}
```

### MVP version

Start without new tables. Generate a temporary ordered list from open `work_items`. Store full focus sessions later.

---

# Dashboard changes recommended now

## 1. Top KPI cards

Current cards:

```txt
Must reply today
People waiting on you
Repeated follow-ups
Drafts ready
```

Recommended cards:

```txt
Decision Debt
People Blocked
Follow-up Risk
Promises at Risk
Drafts Ready
Time to Clear
```

If space is limited, use five:

```txt
Decisions
People Blocked
Follow-ups
Promises
Drafts
```

## 2. Main list filters

Current filters:

```txt
All | Critical | Waiting on me | Follow-ups | Can delegate
```

Recommended filters:

```txt
All | Decisions | Blockers | Follow-ups | Promises | Delegate | FYI
```

## 3. Right AI panel

Current panel is good. Add a stronger `Next Best Action` section:

```txt
Next best action:
Ask legal for confirmation, then approve client reply.

Why:
Client followed up twice. Approval is due today. Legal confirmation is still missing.

Actions:
Ask legal | Approve draft | Delegate | Snooze
```

## 4. Manager Memory panel

Keep it, but add two tabs:

```txt
Active rules
Pending suggestions
```

The AI should not silently save memories. It should suggest memories, and the manager approves them.

## 5. Sidebar

Recommended sidebar:

```txt
Today
Decision Desk
Blocking Others
Follow-ups
Promises
Draft Replies
Delegation
Focus Sessions
Memory & Rules
Weekly Review
Settings
```

## 6. Global command bar

Next to search, add:

```txt
Ask Vesta: "Remind me to call Karim tomorrow" | "Draft reply" | "Treat Cedars as VIP"
```

This makes the dashboard feel like an assistant, not only a report.
