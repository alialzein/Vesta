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
  admin_session:
    'Operator sessions expire after 12 hours for safety. Please sign in again.',
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { redirectedFrom?: string; error?: string };
}) {
  const notice = searchParams.error ? (ERROR_NOTICES[searchParams.error] ?? null) : null;
  return (
    // The page is its own scroll container (the app <body> is overflow:hidden).
    // The old `min-h-screen … overflow-hidden` made anything taller than a
    // phone screen unreachable — the card could not be scrolled (mobile bug,
    // 2026-06-12). dvh (not vh) so mobile browser chrome is accounted for; the
    // inner min-h-full wrapper keeps the card centered when it fits and lets
    // it scroll from the top when it doesn't.
    <main className="v-scroll relative h-[100dvh] overflow-y-auto overflow-x-hidden">
      <LoginAtmosphere />
      <div className="relative z-[1] flex min-h-full items-center justify-center px-4 py-10">
        <AuthForm redirectedFrom={searchParams.redirectedFrom} notice={notice} />
      </div>
    </main>
  );
}
