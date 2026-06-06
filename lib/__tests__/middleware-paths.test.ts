import { describe, expect, it } from 'vitest';
import { isPublicPath } from '@/lib/supabase/middleware';

describe('isPublicPath', () => {
  it('treats auth entry points as public', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/signup')).toBe(true);
    expect(isPublicPath('/auth')).toBe(true);
    expect(isPublicPath('/auth/callback')).toBe(true);
  });

  it('treats the dashboard and app routes as protected', () => {
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/settings')).toBe(false);
    expect(isPublicPath('/work-items/123')).toBe(false);
  });

  it('does not treat lookalike prefixes as public', () => {
    // "/loginsomething" must NOT be considered the public "/login".
    expect(isPublicPath('/loginsomething')).toBe(false);
    expect(isPublicPath('/authentication')).toBe(false);
  });
});
