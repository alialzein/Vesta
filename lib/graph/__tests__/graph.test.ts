// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { encryptToken, decryptToken } from '@/lib/graph/crypto';
import {
  buildAuthorizeUrl,
  getGraphConfig,
  isGraphConfigured,
  resolveRedirectUri,
  shouldRefresh,
  expiryFromNow,
  GRAPH_SCOPES,
  type GraphConfig,
} from '@/lib/graph/oauth';

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
});

describe('token crypto (AES-256-GCM)', () => {
  it('round-trips a token', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'a-sufficiently-long-test-secret-key-123456';
    const secret = 'ya29.super-secret-access-token';
    const enc = encryptToken(secret);
    expect(enc).not.toContain(secret);
    expect(decryptToken(enc)).toBe(secret);
  });

  it('produces different ciphertext each time (random IV)', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'a-sufficiently-long-test-secret-key-123456';
    expect(encryptToken('same')).not.toBe(encryptToken('same'));
  });

  it('throws if the encryption key is missing', () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken('x')).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });
});

describe('graph oauth config', () => {
  it('is not configured without client id/secret', () => {
    delete process.env.MS_GRAPH_CLIENT_ID;
    delete process.env.MS_GRAPH_CLIENT_SECRET;
    expect(getGraphConfig()).toBeNull();
    expect(isGraphConfigured()).toBe(false);
  });

  it('reads config and defaults tenant to common (no redirect env needed)', () => {
    process.env.MS_GRAPH_CLIENT_ID = 'cid';
    process.env.MS_GRAPH_CLIENT_SECRET = 'secret';
    delete process.env.MS_GRAPH_TENANT;
    delete process.env.MS_GRAPH_REDIRECT_URI;
    const cfg = getGraphConfig();
    expect(cfg?.tenant).toBe('common');
    expect(isGraphConfigured()).toBe(true);
  });
});

describe('resolveRedirectUri', () => {
  it('derives from the request origin by default', () => {
    delete process.env.MS_GRAPH_REDIRECT_URI;
    expect(resolveRedirectUri('https://app.example.com')).toBe(
      'https://app.example.com/api/outlook/callback',
    );
    expect(resolveRedirectUri('http://localhost:3000')).toBe(
      'http://localhost:3000/api/outlook/callback',
    );
  });

  it('uses MS_GRAPH_REDIRECT_URI as an override when set', () => {
    process.env.MS_GRAPH_REDIRECT_URI = 'https://proxy.example.com/api/outlook/callback';
    expect(resolveRedirectUri('http://localhost:3000')).toBe(
      'https://proxy.example.com/api/outlook/callback',
    );
  });
});

describe('buildAuthorizeUrl', () => {
  const cfg: GraphConfig = { clientId: 'cid', clientSecret: 'secret', tenant: 'common' };
  const redirectUri = 'http://localhost:3000/api/outlook/callback';

  it('targets the tenant authorize endpoint with code flow + scopes + state', () => {
    const url = new URL(buildAuthorizeUrl(cfg, redirectUri, 'state123'));
    expect(url.origin + url.pathname).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    );
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('state')).toBe('state123');
    expect(url.searchParams.get('redirect_uri')).toBe(redirectUri);
    // Requests offline_access (refresh token) + Mail.Read.
    const scope = url.searchParams.get('scope') ?? '';
    expect(scope).toContain('offline_access');
    expect(scope).toContain('Mail.Read');
    expect(GRAPH_SCOPES.every((s) => scope.includes(s))).toBe(true);
  });
});

describe('token expiry helpers', () => {
  it('refreshes when expiry is null, past, or within the skew window', () => {
    expect(shouldRefresh(null)).toBe(true);
    expect(shouldRefresh(new Date(Date.now() - 1000))).toBe(true);
    expect(shouldRefresh(new Date(Date.now() + 60_000))).toBe(true); // < 120s skew
  });

  it('does not refresh a comfortably valid token', () => {
    expect(shouldRefresh(new Date(Date.now() + 10 * 60_000))).toBe(false);
  });

  it('expiryFromNow returns a future ISO timestamp', () => {
    const iso = expiryFromNow(3600);
    expect(new Date(iso).getTime()).toBeGreaterThan(Date.now());
  });
});
