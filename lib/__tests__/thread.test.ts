import { describe, expect, it } from 'vitest';
import { encodeThreadId, decodeThreadId } from '@/lib/thread';

describe('thread id encoding', () => {
  it('round-trips a normal conversation id', () => {
    const id = 'AAQkAGI2THVlMS1abc123';
    expect(decodeThreadId(encodeThreadId(id))).toBe(id);
  });

  it('round-trips ids with URL-unsafe characters (+ / =)', () => {
    const id = 'AAQk+AGI2/THVl=MS1==';
    const encoded = encodeThreadId(id);
    expect(encoded).not.toMatch(/[+/=]/); // base64url is path-safe
    expect(decodeThreadId(encoded)).toBe(id);
  });
});
