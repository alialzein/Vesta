import { AuthForm } from '../AuthForm';
import { LoginAtmosphere } from '../LoginAtmosphere';

/**
 * Login / signup screen. Public route (middleware lets it through). If already
 * authenticated, middleware redirects to the dashboard.
 *
 * Layout: a centered auth card over a subtle, AI-native atmosphere (blooms + a
 * far-background signal grid). Structure intentionally matches the prior version
 * — this is a brand polish pass, not a redesign.
 */
/** Friendly copy for error flags the middleware/auth callback can send here. */
const ERROR_NOTICES: Record<string, string> = {
  suspended:
    'This account has been suspended by an administrator. Contact your Vesta operator if you believe this is a mistake.',
  auth_callback_failed: 'Sign-in could not be completed. Please try again.',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectedFrom?: string; error?: string };
}) {
  const notice = searchParams.error ? (ERROR_NOTICES[searchParams.error] ?? null) : null;
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <LoginAtmosphere />
      <AuthForm redirectedFrom={searchParams.redirectedFrom} notice={notice} />
    </main>
  );
}
