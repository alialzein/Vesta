import { NextResponse, type NextRequest } from 'next/server';
import { randomBytes } from 'node:crypto';
import { getCurrentUser } from '@/lib/supabase/auth';
import { buildAuthorizeUrl, getGraphConfig, resolveRedirectUri } from '@/lib/graph/oauth';

export const runtime = 'nodejs';

const STATE_COOKIE = 'vesta_oauth_state';

/**
 * Start the Outlook connection (Phase 3). Requires a signed-in user. Generates a
 * CSRF `state`, stores it in an httpOnly cookie, and redirects to Microsoft.
 * If Graph is not configured yet, bounces back to Settings with a flag.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const config = getGraphConfig();
  if (!config) {
    return NextResponse.redirect(`${origin}/settings?outlook=not_configured`);
  }

  const state = randomBytes(16).toString('hex');
  const redirectUri = resolveRedirectUri(origin);
  const res = NextResponse.redirect(buildAuthorizeUrl(config, redirectUri, state));
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  });
  return res;
}
