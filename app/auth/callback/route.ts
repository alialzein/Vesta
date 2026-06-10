import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordLoginEvent, loginContextFromHeaders } from '@/lib/admin/audit';

/**
 * Auth callback for email confirmation / OAuth / password-recovery links.
 * Supabase redirects here with a `code`; we exchange it for a session, then
 * send the user to the dashboard (or the `next` path if provided — e.g.
 * /auth/update-password for a reset link).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Audit the sign-in (best-effort; feeds the admin Audit tab).
      if (data.user) {
        await recordLoginEvent(
          data.user.id,
          'oauth_or_email_link',
          loginContextFromHeaders(request.headers),
        );
      }
      const res = NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/'}`);
      // Play the branded splash once on this fresh login (cleared by the dashboard).
      res.cookies.set('vesta_show_splash', '1', { path: '/', maxAge: 300, sameSite: 'lax' });
      return res;
    }
  }

  // On error or missing code, send back to login with a flag.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
