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
export default function LoginPage({ searchParams }: { searchParams: { redirectedFrom?: string } }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10">
      <LoginAtmosphere />
      <AuthForm redirectedFrom={searchParams.redirectedFrom} />
    </main>
  );
}
