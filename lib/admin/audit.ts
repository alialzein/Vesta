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
/** Where/what a sign-in came from (for the login audit trail). */
export type LoginContext = {
  ip: string | null;
  city: string | null;
  country: string | null;
  userAgent: string | null;
};

/**
 * Pull the caller's IP + geo from request headers. On Vercel the edge network
 * stamps `x-vercel-ip-city/-country`; locally those are absent and only the IP
 * (or nothing) is available — the UI shows what exists.
 */
export function loginContextFromHeaders(h: Headers): LoginContext {
  const decode = (v: string | null) => {
    if (!v) return null;
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  };
  return {
    ip: (h.get('x-forwarded-for') ?? '').split(',')[0]?.trim() || null,
    city: decode(h.get('x-vercel-ip-city')),
    country: h.get('x-vercel-ip-country'),
    userAgent: h.get('user-agent'),
  };
}

/**
 * Record a successful sign-in as an audit event (action 'login'), so the Audit
 * tab and the per-user history show real login activity — including where it
 * came from. Best-effort — never blocks the sign-in itself.
 */
export async function recordLoginEvent(
  userId: string,
  method: 'password' | 'oauth_or_email_link',
  context?: LoginContext,
): Promise<void> {
  try {
    const svc = createServiceClient();
    await svc.from('audit_logs').insert({
      user_id: userId,
      actor_type: 'user',
      actor_id: userId,
      action: 'login',
      entity_type: 'session',
      metadata: {
        method,
        ip: context?.ip ?? null,
        city: context?.city ?? null,
        country: context?.country ?? null,
        user_agent: context?.userAgent ?? null,
      } as Json,
    });
  } catch {
    /* observability only */
  }
}

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
