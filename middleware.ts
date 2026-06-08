import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on page routes only. API routes are excluded (`api`) because they
  // authenticate themselves and have NO user session: the Outlook OAuth callback
  // exchanges a code, the webhook receives Microsoft POSTs, and the cron
  // endpoints use CRON_SECRET. Without this, the session-redirect would bounce
  // them to /login (302) — dropping the OAuth code and 401-ing the cron/webhook.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
