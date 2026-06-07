import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, getGraphConfig, resolveRedirectUri } from '@/lib/graph/oauth';
import { getMe } from '@/lib/graph/client';
import { storeTokens } from '@/lib/graph/tokens';

export const runtime = 'nodejs';

const STATE_COOKIE = 'vesta_oauth_state';

/**
 * Microsoft OAuth callback (Phase 3). Verifies CSRF state, exchanges the code for
 * per-user tokens, reads /me, upserts the user's user_integrations + mailboxes
 * rows (own-rows via the authenticated client), and stores the encrypted tokens
 * (service-role RPC). Redirects back to Settings.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;
  const settings = (q: string) => NextResponse.redirect(`${origin}/settings?${q}`);

  // Provider error (user denied, etc.)
  const oauthError = params.get('error');
  if (oauthError) return settings(`outlook=error&reason=${encodeURIComponent(oauthError)}`);

  const code = params.get('code');
  const state = params.get('state');
  const cookieState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return settings('outlook=error&reason=invalid_state');
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const config = getGraphConfig();
  if (!config) return settings('outlook=not_configured');

  try {
    const redirectUri = resolveRedirectUri(origin);
    const tokens = await exchangeCodeForTokens(config, redirectUri, code);
    const me = await getMe(tokens.access_token);
    const mailboxEmail = me.mail ?? me.userPrincipalName ?? null;

    const supabase = createClient();

    // Upsert the integration (own row via RLS). One Microsoft integration per user.
    const { data: integration, error: integErr } = await supabase
      .from('user_integrations')
      .upsert(
        {
          user_id: user.id,
          provider: 'microsoft',
          status: 'connected',
          provider_user_id: me.id,
          provider_email: mailboxEmail,
          scopes: tokens.scope ? tokens.scope.split(' ') : [],
          connected_at: new Date().toISOString(),
          last_error: null,
        },
        { onConflict: 'user_id,provider,provider_user_id' },
      )
      .select('id')
      .single();
    if (integErr || !integration) {
      return settings('outlook=error&reason=integration_save');
    }

    // Upsert the mailbox row.
    await supabase.from('mailboxes').upsert(
      {
        user_id: user.id,
        integration_id: integration.id,
        provider: 'microsoft',
        provider_user_id: me.id,
        mailbox_email: mailboxEmail,
        mailbox_display_name: me.displayName ?? null,
        mailbox_type: 'primary',
        status: 'active',
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'integration_id,provider_user_id,mailbox_email' },
    );

    // Store encrypted tokens (service-role RPC → private schema).
    await storeTokens(integration.id, tokens);

    const res = settings('outlook=connected');
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch {
    return settings('outlook=error&reason=exchange_failed');
  }
}
