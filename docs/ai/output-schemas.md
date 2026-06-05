# AI Output Schemas

Use these as the basis for Zod schemas or equivalent runtime validation.

## Work item analysis

```ts
export const WorkItemAnalysisSchema = z.object({
  summary: z.string().min(1).max(500),
  category: z.enum([
    'must_reply',
    'waiting_on_me',
    'waiting_on_other',
    'needs_decision',
    'needs_approval',
    'follow_up_risk',
    'delegate',
    'reminder',
    'draft_ready',
    'manual_task',
    'fyi',
    'low_priority',
    'unknown',
  ]),
  urgency: z.enum(['critical', 'high', 'medium', 'low']),
  priority_score: z.number().int().min(0).max(100),
  requires_reply: z.boolean(),
  requires_decision: z.boolean(),
  requires_approval: z.boolean(),
  can_delegate: z.boolean(),
  suggested_delegate: z.string().nullable(),
  detected_deadline: z.string().datetime().nullable(),
  suggested_action: z.string().max(700),
  user_visible_reason: z.string().max(700),
  risk_flags: z.array(z.string()).default([]),
  commitments: z
    .array(
      z.object({
        commitment_type: z.enum([
          'manager_promised',
          'other_promised',
          'requested_from_manager',
          'requested_from_other',
        ]),
        commitment_text: z.string().max(500),
        due_at: z.string().datetime().nullable(),
        promisor_name: z.string().nullable(),
        promisor_email: z.string().email().nullable(),
        confidence: z.number().min(0).max(1),
      }),
    )
    .default([]),
  memory_suggestions: z
    .array(
      z.object({
        type: z.string(),
        text: z.string().max(500),
        confidence: z.number().min(0).max(1),
      }),
    )
    .default([]),
  confidence: z.number().min(0).max(1),
});
```

## Draft reply

```ts
export const DraftReplySchema = z.object({
  subject: z.string().min(1).max(200),
  body_text: z.string().min(1).max(5000),
  tone: z.string().max(80),
  warnings: z.array(z.string().max(300)).default([]),
  requires_human_review: z.literal(true),
});
```

## Manual task parser

```ts
export const ManualTaskParseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).nullable(),
  due_at: z.string().datetime().nullable(),
  reminder_at: z.string().datetime().nullable(),
  related_person: z.string().nullable(),
  related_project: z.string().nullable(),
  priority_score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
});
```

## Focus mode plan

```ts
export const FocusPlanSchema = z.object({
  session_title: z.string().min(1).max(200),
  estimated_total_minutes: z.number().int().min(1).max(240),
  items: z
    .array(
      z.object({
        work_item_id: z.string().uuid(),
        position: z.number().int().min(1),
        estimated_minutes: z.number().int().min(1).max(60),
        recommended_action: z.string().min(1).max(500),
        reason: z.string().min(1).max(500),
      }),
    )
    .min(1)
    .max(20),
});
```
