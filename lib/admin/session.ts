/**
 * Admin session policy (pure — used by the middleware, unit tested).
 *
 * Operator sessions are short-lived by design: the console controls every
 * account, so a forgotten open tab must not stay powerful for days. After
 * MAX_ADMIN_SESSION_HOURS from the last sign-in the middleware ends the
 * session and asks the admin to sign in again.
 */
export const MAX_ADMIN_SESSION_HOURS = 12;

export function adminSessionExpired(
  lastSignInAt: string | null | undefined,
  now: Date = new Date(),
  maxHours: number = MAX_ADMIN_SESSION_HOURS,
): boolean {
  if (!lastSignInAt) return false; // no timestamp → can't judge; let auth itself decide
  const signedIn = new Date(lastSignInAt).getTime();
  if (Number.isNaN(signedIn)) return false;
  return now.getTime() - signedIn > maxHours * 60 * 60 * 1000;
}
