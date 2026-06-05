# Behavior and Memory Rules

## Two memory layers

### 1. Structured rules

Stored in `manager_rules`.

Examples:

```txt
CEO is always VIP.
Cedars Group is top priority.
Finance approvals can be delegated to Rania.
Never auto-send emails to clients.
Use short direct replies.
```

Structured rules can affect deterministic scoring.

### 2. Semantic memories

Stored in `manager_memories` with embeddings.

Examples:

```txt
Cedars Group expects same-day replies.
Project Phoenix is sensitive this quarter.
The manager prefers concise replies without long introductions.
```

Semantic memories provide context to AI prompts.

## Memory approval

AI can suggest memories, but the manager must approve them.

Allowed buttons:

```txt
Remember
Edit and remember
Ignore
Never suggest this again
Forget
```

## Memory safety

Do not store:

- Passwords.
- API keys.
- Personal medical information.
- Unnecessary sensitive personal data.
- Full email bodies as memory.
- Private secrets found in messages.

## Memory retrieval

For each AI analysis:

1. Build query from sender, domain, subject, project, and summary.
2. Load deterministic rules.
3. Retrieve top semantic memories.
4. Deduplicate.
5. Limit to only relevant memories.
6. Pass to AI prompt.

## Learning from edits

When manager edits a draft:

- Save edit diff summary.
- Ask if tone/preference should be remembered.
- Do not automatically create memory unless explicitly enabled later.

## Memory review page

Must show:

```txt
Active memories
Active rules
Pending suggestions
Disabled memories
Source of each memory
Created date
Edit/delete controls
```
