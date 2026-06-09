import { describe, expect, it } from 'vitest';
import { buildCapturePrompt, parseCapture } from '@/lib/ai/quick-capture';

describe('parseCapture', () => {
  it('reads a full capture object', () => {
    const c = parseCapture(
      '{"title":"Call Toufik","kind":"call","dueAt":"2026-06-11T14:00:00Z","person":"Toufik"}',
      'fallback',
    );
    expect(c.title).toBe('Call Toufik');
    expect(c.kind).toBe('call');
    expect(c.person).toBe('Toufik');
    expect(new Date(c.dueAt!).getUTCHours()).toBe(14);
  });

  it('falls back the title and defaults the kind', () => {
    const c = parseCapture('{"dueAt":null}', 'my fallback');
    expect(c.title).toBe('my fallback');
    expect(c.kind).toBe('task');
    expect(c.dueAt).toBeNull();
    expect(c.person).toBeNull();
  });

  it('rejects an invalid kind and an unparseable date', () => {
    const c = parseCapture('{"title":"x","kind":"banana","dueAt":"not a date"}', 'f');
    expect(c.kind).toBe('task');
    expect(c.dueAt).toBeNull();
  });

  it('tolerates code fences', () => {
    const c = parseCapture('```json\n{"title":"Y","kind":"meeting"}\n```', 'f');
    expect(c.title).toBe('Y');
    expect(c.kind).toBe('meeting');
  });

  it('throws when there is no JSON', () => {
    expect(() => parseCapture('nope', 'f')).toThrow();
  });
});

describe('buildCapturePrompt', () => {
  it('includes the note + current time and asks for JSON only', () => {
    const { system, user } = buildCapturePrompt(
      'call toufik tomorrow',
      'Tue Jun 09 2026 15:00:00 GMT+0300',
    );
    expect(user).toContain('call toufik tomorrow');
    expect(user).toContain('GMT+0300');
    expect(system).toMatch(/ONLY a JSON object/i);
  });
});
