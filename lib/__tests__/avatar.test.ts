import { describe, expect, it } from 'vitest';
import { avatarHue, initialsOf } from '@/lib/avatar';

describe('avatarHue', () => {
  it('is deterministic and within 0–359', () => {
    const h = avatarHue('user-123');
    expect(h).toBe(avatarHue('user-123'));
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });

  it('differs for different keys (stable identity colors)', () => {
    expect(avatarHue('maya@cedars.com')).not.toBe(avatarHue('rania@vesta.app'));
  });
});

describe('initialsOf', () => {
  it('takes first + last initials from a full name, ignoring org suffixes', () => {
    expect(initialsOf('Maya Khoury')).toBe('MK');
    expect(initialsOf('Lina Saad (HR)')).toBe('LS');
  });

  it('falls back to the email local part', () => {
    expect(initialsOf(null, 'rania.haddad@vesta.app')).toBe('RH');
    expect(initialsOf('', 'board@vesta.app')).toBe('B');
  });

  it('returns ? when nothing is known', () => {
    expect(initialsOf(null, null)).toBe('?');
  });
});
