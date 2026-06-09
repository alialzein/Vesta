import 'server-only';
import { createServiceClient } from '@/lib/supabase/service';
import type { Json } from '@/lib/database.types';

/**
 * Write an admin action to `audit_logs`. Every mutating operator action
 * (suspend, delete, purge, password reset, settings change, re-analyze, …) calls
 * this so there is a who/when/what trail (Audit & Security tab reads it later).
 *
 * `user_id` is set to the affected user when there is one (so a user's own audit
 * view can show it), else to the acting admin. `actor_id` is always the admin.
 */
export async function logAdminAction(opts: {
  actorId: string;
  action: string;
  entityType?: string;
  entityId?: string | null;
  targetUserId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const svc = createServiceClient();
  await svc.from('audit_logs').insert({
    user_id: opts.targetUserId ?? opts.actorId,
    actor_type: 'admin',
    actor_id: opts.actorId,
    action: opts.action,
    entity_type: opts.entityType ?? null,
    entity_id: opts.entityId ?? null,
    before: (opts.before ?? null) as Json,
    after: (opts.after ?? null) as Json,
    metadata: (opts.metadata ?? {}) as Json,
  });
}
