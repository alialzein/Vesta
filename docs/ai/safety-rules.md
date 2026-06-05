# AI Safety Rules

## Approval gates

Human approval is required for:

- Sending email.
- Creating Outlook rules.
- Saving AI-suggested memory.
- Deleting or archiving messages.
- Delegating externally.
- Any action involving legal, HR, finance, contracts, confidential topics, or angry clients.

## Auto-send rule

Auto-send is forbidden in MVP.

Allowed:

```txt
Generate draft
Edit draft
Approve draft
Send approved draft
```

Not allowed:

```txt
AI sends without explicit approval
AI replies automatically to client
AI creates legal/finance commitments automatically
```

## Data minimization

Send only necessary context to AI:

```txt
subject
sender
body preview or relevant excerpt
thread summary
recent relevant messages
deterministic signals
relevant memories
```

Avoid:

```txt
entire mailbox
unrelated old threads
full attachments in MVP
secrets/passwords/API keys
```

## Sensitive topic warnings

If a work item relates to sensitive topics, the AI should add warnings and lower automation level.

Sensitive topics:

```txt
legal
contract
finance
payment
HR
termination
medical
security
confidential
angry client
```

## User-visible copy

Use this in UI:

```txt
AI drafted this reply. Please review before sending.
```

```txt
Vesta will not send emails automatically unless you explicitly enable that later.
```

```txt
This memory affects future prioritization. You can edit or delete it anytime.
```
