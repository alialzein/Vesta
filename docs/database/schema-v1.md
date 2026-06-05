# Schema V1 — Database Blueprint

This file defines the planned V1 database. It is intentionally implementation-oriented but still readable.

## Identity and integration

### profiles

Purpose: application user profile.

Important fields:

```txt
id uuid primary key references auth.users(id)
email text display only
full_name text
timezone text
role text
created_at
updated_at
```

Portability rule:

- `profiles.email` is not identity.
- Do not join ownership through email.

### user_integrations

Purpose: one connected provider for a user, such as Microsoft Graph.

Important fields:

```txt
id
user_id
provider
status
provider_user_id
provider_tenant_id
provider_email
scopes
connected_at
last_sync_at
last_error
metadata
```

### mailboxes

Purpose: one Microsoft mailbox connected through an integration.

This table is added to make moving/reconnecting emails easier.

Important fields:

```txt
id
user_id
integration_id
provider
provider_tenant_id
provider_user_id
mailbox_email
mailbox_display_name
mailbox_type: primary | shared | alias | previous
aliases text[]
status: active | disconnected | archived | transfer_pending
connected_at
last_sync_at
metadata
```

Uniqueness:

```txt
unique(integration_id, provider_user_id, mailbox_email)
```

### private.graph_tokens

Purpose: private encrypted Microsoft tokens.

Important fields:

```txt
id
integration_id
encrypted_access_token
encrypted_refresh_token
access_token_expires_at
granted_scopes
created_at
updated_at
```

Rule:

- No browser access.
- Private schema or equivalent protected storage.

### sync_cursors

Purpose: delta sync cursor per mailbox resource/folder.

Important fields:

```txt
id
user_id
integration_id
mailbox_id
provider
resource_type
resource_id
delta_link
next_link
last_success_at
last_error
metadata
```

## Work source data

### people

Purpose: people known to the manager.

Important fields:

```txt
id
user_id
display_name
email
domain
company
is_vip
vip_reason
default_priority_boost
relationship_notes
metadata
```

### projects

Purpose: projects/clients/topics used for prioritization.

Important fields:

```txt
id
user_id
name
description
status
priority_boost
metadata
```

### email_threads

Purpose: grouped Outlook conversation.

Important fields:

```txt
id
user_id
integration_id
mailbox_id
graph_conversation_id
subject_normalized
participants
latest_message_at
latest_inbound_at
latest_outbound_at
inbound_after_last_outbound_count
followup_count
is_waiting_on_manager
is_waiting_on_other
thread_summary
metadata
```

Uniqueness:

```txt
unique(mailbox_id, graph_conversation_id)
```

### email_messages

Purpose: Outlook messages stored locally.

Important fields:

```txt
id
user_id
integration_id
mailbox_id
thread_id
graph_message_id
graph_folder_id
graph_conversation_id
internet_message_id
conversation_index
direction
subject
body_preview
body_text
body_html
sender_name
sender_email
from_email
to_recipients jsonb
cc_recipients jsonb
importance
is_read
has_attachments
categories
flag jsonb
web_link
received_at
sent_at
deleted_at
raw_graph jsonb
content_hash
ai_relevant_hash
created_at
updated_at
```

Uniqueness:

```txt
unique(mailbox_id, graph_message_id)
```

## Unified work

### work_items

Purpose: the one table the dashboard mainly reads.

Important fields:

```txt
id
user_id
integration_id nullable
mailbox_id nullable
source
source_id
source_external_id
thread_id
title
summary
category
status
urgency
priority_score
due_at
snoozed_until
completed_at
assigned_to
related_person_id
related_project_id
requires_reply
requires_decision
requires_approval
can_delegate
suggested_delegate
suggested_action
urgency_reason
confidence
last_analyzed_at
analysis_version
metadata
created_at
updated_at
```

Indexes:

```txt
(user_id, status, priority_score desc, due_at asc nulls last)
(user_id, category, status)
(mailbox_id, source_external_id)
```

### commitments

Purpose: first-class promise/commitment tracker.

Can be added after MVP extraction works. Before then, use `work_items.source = ai_commitment`.

Important fields:

```txt
id
user_id
work_item_id
source
source_id
commitment_type
promisor_name
promisor_email
owner_user_id
commitment_text
due_at
status
confidence
extracted_from_quote
created_at
updated_at
```

### focus_sessions

Purpose: persist Clear My Day sessions later.

Important fields:

```txt
id
user_id
started_at
ended_at
target_minutes
estimated_total_minutes
status
summary
created_at
```

### focus_session_items

Purpose: work items in a focus session.

Important fields:

```txt
id
user_id
session_id
work_item_id
position
estimated_minutes
recommended_action
completed_at
created_at
```

## AI and actions

### ai_analyses

Purpose: history of AI classification/analysis.

Important fields:

```txt
id
user_id
work_item_id
source_hash
model
prompt_version
input_summary
output jsonb
priority_score
category
urgency
user_visible_reason
confidence
token_input
token_output
cost_estimate_usd
error
created_at
```

### tasks

Purpose: manual or parsed tasks.

Important fields:

```txt
id
user_id
work_item_id
title
description
due_at
status
source
parsed_from_text
metadata
```

### reminders

Purpose: reminder scheduler.

Important fields:

```txt
id
user_id
work_item_id
title
remind_at
timezone
status
recurrence_rule
delivery_channels
last_sent_at
snoozed_until
metadata
```

### draft_replies

Purpose: AI drafts and send approval workflow.

Important fields:

```txt
id
user_id
work_item_id
email_message_id
graph_draft_message_id
status
to_recipients
cc_recipients
subject
body_text
body_html
ai_generated_body
user_edited_body
edit_diff_summary
tone
model
prompt_version
approved_at
sent_at
error
metadata
```

## Memory and rules

### manager_rules

Purpose: deterministic rules that can override/boost AI.

Important fields:

```txt
id
user_id
name
description
is_enabled
rule_type
conditions jsonb
actions jsonb
priority
created_from
created_at
updated_at
```

### manager_memories

Purpose: softer context for AI.

Important fields:

```txt
id
user_id
memory_type
memory_text
scope
scope_ref
source
confidence
is_active
embedding vector
metadata
created_at
updated_at
```

### feedback_events

Purpose: user corrections that teach Vesta.

Important fields:

```txt
id
user_id
work_item_id
event_type
feedback_text
old_value jsonb
new_value jsonb
processed_at
created_at
```

## Logs, briefs, and notifications

### audit_logs

Purpose: immutable-ish log of important actions.

Important fields:

```txt
id
user_id
actor_type
actor_id
action
entity_type
entity_id
before jsonb
after jsonb
metadata
created_at
```

### notification_events

Purpose: dashboard/email/Teams/browser notification events.

Important fields:

```txt
id
user_id
work_item_id
channel
title
body
status
sent_at
error
metadata
created_at
```

### daily_briefs

Purpose: generated morning briefs.

Important fields:

```txt
id
user_id
brief_date
title
summary
sections jsonb
generated_by_model
created_at
```

### webhook_events

Purpose: raw external webhook event tracking and replay/debug.

Important fields:

```txt
id
provider
subscription_id
user_id
integration_id
mailbox_id
event_type
payload jsonb
status
processed_at
error
created_at
```

### account_transfer_events

Purpose: audit account/mailbox transfer or reattachment events.

Important fields:

```txt
id
requested_by_user_id
source_user_id
target_user_id
source_mailbox_id
target_mailbox_id
transfer_type
status
reason
before_counts jsonb
after_counts jsonb
approved_at
completed_at
error
created_at
```
