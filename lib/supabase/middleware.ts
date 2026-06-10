import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/lib/database.types';

/**
 * Refreshes the Supabase auth session on every request and enforces route
 * protection:
 *   - Unauthenticated users hitting a protected route -> redirect to /login.
 *   - Suspended accounts (app_metadata.suspended) -> signed out + /login notice.
 *   - Admin accounts (app_metadata.is_admin) live ONLY in /admin — any app page
 *     redirects them to the operator console (the admin account is not a user
 *     account; it has no mailbox/dashboard).
 *   - Authenticated users hitting /login or /signup -> redirect to / (or /admin).
 *
 * Both gates read auth-token claims (`app_metadata` is server-only; users cannot
 * edit it), so no extra DB round-trip happens per request.
 *
 * Public (unauthenticated) paths: /welcome (the marketing landing), /login,
 * /signup, /auth/* (the OAuth/email confirmation callback + update-password),
 * and Next internals/static assets (excluded by the matcher in middleware.ts).
 */
const PUBLIC_PATHS = ['/welcome', '/login', '/signup', '/auth'];

/** True for routes reachable without a session (login/signup + auth callback). */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: getUser() revalidates the token with Supabase Auth. Do not trust
  // getSession() alone for authorization decisions.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const publicPath = isPublicPath(pathname);

  if (!user && !publicPath) {
    const url = request.nextUrl.clone();
    // A signed-out visit to the root is a first impression, not a lost deep
    // link — show the marketing landing. Deep links still go to login and
    // bounce back to where they were headed.
    if (pathname === '/') {
      url.pathname = '/welcome';
      url.search = '';
      return NextResponse.redirect(url);
    }
    url.pathname = '/login';
    url.searchParams.set('redirectedFrom', pathname);
    return NextResponse.redirect(url);
  }

  // Suspended account: kill the session and explain on the login screen. The
  // claim is stamped by the admin Suspend action (alongside a Supabase ban that
  // blocks new sign-ins); this check ends any session that already existed.
  if (user && user.app_metadata?.suspended === true) {
    await supabase.auth.signOut();
    // signOut wrote its cookie-clearing headers onto `response` (via setAll);
    // copy them onto the redirect or the dead session would keep looping back.
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('error', 'suspended');
    const redirect = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  }

  const isAdmin = user?.app_metadata?.is_admin === true;

  // Admins are operators, not app users — keep them inside /admin.
  if (user && isAdmin && !publicPath && !pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  // Signed-in users never see the auth screens or the marketing landing.
  if (user && (pathname === '/login' || pathname === '/signup' || pathname === '/welcome')) {
    const url = request.nextUrl.clone();
    url.pathname = isAdmin ? '/admin' : '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
