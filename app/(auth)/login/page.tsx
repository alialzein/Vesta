import { AuthForm } from '../AuthForm';

/**
 * Login / signup screen. Public route (middleware lets it through). If already
 * authenticated, middleware redirects to the dashboard.
 */
export default function LoginPage({ searchParams }: { searchParams: { redirectedFrom?: string } }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <AuthForm redirectedFrom={searchParams.redirectedFrom} />
    </main>
  );
}
