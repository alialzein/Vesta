/**
 * Authorize a scheduled/cron request by a shared secret (Phase 5). The scheduler
 * (Supabase pg_cron, Vercel Cron, or any external cron) calls the cron API routes
 * with the secret in the Authorization header. Pure + unit-tested.
 *
 * Denies when CRON_SECRET is unset so the endpoints are never open by accident.
 */
export function isAuthorizedCron(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  if (!authHeader) return false;
  const provided = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  return safeEqual(provided.trim(), secret.trim());
}

/** Constant-time string compare (no early-exit timing leak on a secret). */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
