import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Auth callback for email confirmation / OAuth.
 * Supabase redirects here with a `code`; we exchange it for a session, then
 * send the user to the dashboard (or the `next` path if provided).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/'}`);
    }
  }

  // On error or missing code, send back to login with a flag.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
