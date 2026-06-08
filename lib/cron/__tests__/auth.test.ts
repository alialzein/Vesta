import { describe, expect, it } from 'vitest';
import { isAuthorizedCron } from '../auth';

describe('isAuthorizedCron', () => {
  const secret = 's3cret-value';

  it('accepts the bare secret', () => {
    expect(isAuthorizedCron(secret, secret)).toBe(true);
  });

  it('accepts a Bearer-prefixed secret', () => {
    expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true);
  });

  it('rejects a wrong secret', () => {
    expect(isAuthorizedCron('nope', secret)).toBe(false);
    expect(isAuthorizedCron('Bearer nope', secret)).toBe(false);
  });

  it('rejects when there is no header', () => {
    expect(isAuthorizedCron(null, secret)).toBe(false);
  });

  it('denies when the secret is not configured (never open by accident)', () => {
    expect(isAuthorizedCron(secret, undefined)).toBe(false);
    expect(isAuthorizedCron('Bearer x', '')).toBe(false);
  });

  it('tolerates surrounding whitespace', () => {
    expect(isAuthorizedCron(`Bearer ${secret} `, ` ${secret}`)).toBe(true);
  });
});
